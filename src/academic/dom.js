export function el(tag,attrs={},...children) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)) {
    if(key==='class')node.className=value;
    else if(key.startsWith('on'))node.addEventListener(key.slice(2).toLowerCase(),value);
    else if(value!==false&&value!=null){if(key in node&&key!=='list')node[key]=value;else node.setAttribute(key,String(value));}
  }
  for(const child of children.flat(Infinity))if(child!=null)node.append(typeof child==='string'||typeof child==='number'?document.createTextNode(String(child)):child);
  return node;
}
export function button(label,handler,className='secondary',attrs={}) { return el('button',{type:'button',class:className,onClick:handler,...attrs},label); }
