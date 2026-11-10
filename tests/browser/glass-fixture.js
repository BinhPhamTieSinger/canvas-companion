import './timetable-fixture.js';
import {glassStyles,AuthoredSurfaces} from '../../src/background/glass.js';
const root=document.documentElement;root.dataset.canvasCompanionBackground='custom';root.dataset.canvasCompanionSurface='transparent';
root.style.cssText='--bctext-0:#eef3fa;--bctext-1:#c1cfdf;--bclinks-ungradient:#9cdcfe;--bcborders:#c6dcff38;--cc-surface:transparent;--cc-raised:#17263dbb';
const style=document.createElement('style');style.textContent=glassStyles;document.head.append(style);
const authored=new AuthoredSurfaces(document);authored.scan();
const checks={coursePanel:getComputedStyle(document.querySelector('.user_content section')).backgroundColor,tray:getComputedStyle(document.querySelector('#nav-tray-portal span')).backgroundColor,trayLink:getComputedStyle(document.querySelector('#nav-tray-portal a')).color,authoredClass:document.querySelector('.user_content section').classList.contains('cc-authored-glass')};
document.querySelector('#result').textContent=JSON.stringify(checks);
