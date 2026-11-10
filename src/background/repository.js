import { configuration, defaultRecord, SCOPE, assetId, ConflictError, MAX_IMAGE_BYTES, MIME_TYPES } from './model.js';

import { openDatabase, request, completed as complete } from '../storage/database.js';

export class BackgroundRepository {
  constructor(name = 'canvas-companion') { this.name = name; this.database = null; }
  async open() {
    if (this.database) return this.database;
    this.database = openDatabase(this.name).then(db => {
      db.onversionchange = () => { db.close(); this.database = null; };
      return db;
    }).catch(error => { this.database = null; throw error; });
    return this.database;
  }
  async read() {
    const db = await this.open();
    return (await request(db.transaction('backgrounds').objectStore('backgrounds').get(SCOPE))) || defaultRecord();
  }
  async asset(id) {
    const db = await this.open();
    return request(db.transaction('assets').objectStore('assets').get(id));
  }
  async save(input, expectedRevision, upload = null) {
    const next = configuration(input);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('Reload the settings before saving.');
    let newAsset;
    if (upload) {
      const id = await assetId(upload);
      if (next.source?.kind !== 'asset' || next.source.id !== id) throw new Error('The selected image changed. Select it again.');
      newAsset = { id, blob: upload };
    }
    const db = await this.open();
    const tx = db.transaction(['backgrounds', 'assets', 'recovery'], 'readwrite');
    const done = complete(tx);
    try {
      const store = tx.objectStore('backgrounds');
      const current = (await request(store.get(SCOPE))) || defaultRecord();
      if (current.revision !== expectedRevision) throw new ConflictError();
      const assets = tx.objectStore('assets');
      if (newAsset) {
        const exists = await request(assets.get(newAsset.id));
        if (!exists) assets.put(newAsset);
      }
      if (next.source?.kind === 'asset' && !newAsset && !(await request(assets.get(next.source.id)))) throw new Error('That image is unavailable. Select it again.');
      // A bounded one-step recovery snapshot preserves the last committed config and asset.
      tx.objectStore('recovery').put({ scope: SCOPE, record: current });
      const record = { ...next, revision: current.revision + 1, updatedAt: new Date().toISOString() };
      store.put(record);
      const keep = new Set([record.source?.id, current.source?.id].filter(Boolean));
      const keys = await request(assets.getAllKeys());
      for (const key of keys) if (!keep.has(key)) assets.delete(key);
      await done;
      return record;
    } catch (error) {
      try { tx.abort(); } catch { /* already completed/aborted */ }
      await done.catch(() => {});
      if (error?.name === 'QuotaExceededError') throw new Error('Browser storage is full. Export a backup before removing any saved data.');
      throw error;
    }
  }
  async recovery() {
    const db = await this.open();
    return (await request(db.transaction('recovery').objectStore('recovery').get(SCOPE)))?.record || null;
  }
  async restore(expectedRevision) {
    const previous = await this.recovery();
    if (!previous) throw new Error('No previous background is available to restore.');
    return this.save(previous, expectedRevision);
  }
  async export() {
    const db = await this.open();
    const tx = db.transaction(['backgrounds', 'assets'], 'readonly');
    const [record, assets] = await Promise.all([
      request(tx.objectStore('backgrounds').get(SCOPE)), request(tx.objectStore('assets').getAll()),
    ]);
    const selected = (assets || []).filter(asset => asset.id === record?.source?.id);
    const encoded = await Promise.all(selected.map(async asset => {
      const bytes = new Uint8Array(await asset.blob.arrayBuffer());
      let text = '';
      for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { id: asset.id, type: asset.blob.type, data: btoa(text) };
    }));
    return { format: 'canvas-companion-background', version: 1, record: record || defaultRecord(), assets: encoded };
  }
  async import(backup, revision) {
    if (backup?.format !== 'canvas-companion-background' || backup.version !== 1 || !Array.isArray(backup.assets) || backup.assets.length > 1) throw new Error('This is not a supported Canvas Companion backup.');
    const next = configuration(backup.record);
    let blob = null;
    if (next.source?.kind === 'asset') {
      const asset = backup.assets.find(asset => asset.id === next.source.id);
      if (!asset || !MIME_TYPES.has(asset.type) || typeof asset.data !== 'string' || asset.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error('The backup image is invalid or too large.');
      let binary;
      try { binary = atob(asset.data); } catch { throw new Error('The backup image is invalid.'); }
      blob = new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))], { type: asset.type });
      if (await assetId(blob) !== asset.id) throw new Error('The backup image checksum does not match.');
    }
    return this.save(next, revision, blob);
  }
}
