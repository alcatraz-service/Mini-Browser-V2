import { appWindow, LogicalSize, currentMonitor, WebviewWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { setBorderPx, setControlsCollapsed } from "./ui";
import { dict, Lang } from "./i18n";

const urlInput = document.getElementById("url") as HTMLInputElement;
const openBtn = document.getElementById("open") as HTMLButtonElement;
const home = document.getElementById("home") as HTMLDivElement;
const handle = document.getElementById("handle") as HTMLDivElement;

type Settings = {
  lang: Lang;
  showAddress: boolean;
  showTabs: boolean;
  onTop: boolean;
  rememberSession: boolean;
  borderPx: 0|1|2|3;
  ribbon: { enabled: boolean; width: number; height: number };
  hud: boolean;
  snap: boolean;
  bookmarks: string[];
};
const defaults: Settings = {
  lang: "ru",
  showAddress: true,
  showTabs: true,
  onTop: false,
  rememberSession: true,
  borderPx: 3,
  ribbon: { enabled: false, width: 480, height: 120 },
  hud: false,
  snap: false,
  bookmarks: ["https://www.google.com"]
};

let settings: Settings = defaults;

async function loadSettings() {
  try { settings = { ...defaults, ...(await invoke("read_settings")) as any }; } catch { settings = defaults; }
  setControlsCollapsed(!settings.showAddress);
  setBorderPx(settings.borderPx);
  if (settings.onTop) await appWindow.setAlwaysOnTop(true);
}
async function saveSettings() { await invoke("write_settings", { value: settings }); }

async function navigate(url: string) {
  if (!url) return;
  home.style.display = "none";
  urlInput.value = url;
  await appWindow.eval(`location.href = ${JSON.stringify(url)};`);
  await invoke("append_history", { url });
}

window.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 't') { e.preventDefault(); const on = !(await appWindow.isAlwaysOnTop()); await appWindow.setAlwaysOnTop(on); settings.onTop = on; saveSettings(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); const op: number = await invoke("cycle_opacity") as any; await appWindow.setOpacity(op); }
  if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); setControlsCollapsed(false); (document.getElementById('url') as HTMLInputElement).focus(); }
});

openBtn.onclick = () => navigate(urlInput.value.trim());
(document.getElementById("homeGo") as HTMLButtonElement).onclick = () => {
  const val = (document.getElementById("homeInput") as HTMLInputElement).value.trim();
  navigate(val.startsWith("http") ? val : `https://www.google.com/search?q=${encodeURIComponent(val)}`);
};
(document.getElementById("btnClose") as HTMLButtonElement).onclick = () => appWindow.close();
(document.getElementById("btnPin") as HTMLButtonElement).onclick = async () => {
  const on = !(await appWindow.isAlwaysOnTop()); await appWindow.setAlwaysOnTop(on); settings.onTop = on; saveSettings();
};
(document.getElementById("btnOpacity") as HTMLButtonElement).onclick = async () => {
  const op: number = await invoke("cycle_opacity") as any; await appWindow.setOpacity(op);
};
(document.getElementById("btnSettings") as HTMLButtonElement).onclick = async () => {
  const label = "settings";
  const existing = WebviewWindow.getByLabel(label);
  if (existing) { existing.setFocus(); return; }
  const pos = await appWindow.outerPosition();
  const size = await appWindow.outerSize();
  const win = new WebviewWindow(label, {
    url: "index.html#settings",
    width: 340,
    height: 520,
    x: pos.x + size.width - 340 + 12,
    y: pos.y + 28,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true
  });
  win.once("tauri://created", () => {});
};

handle.onclick = () => { settings.showAddress = !settings.showAddress; setControlsCollapsed(!settings.showAddress); saveSettings(); };

async function applyRibbon() {
  if (!settings.ribbon.enabled) return;
  await appWindow.setSize(new LogicalSize(settings.ribbon.width, settings.ribbon.height));
}
async function applyHud() { await invoke("set_ignore_cursor", { ignore: settings.hud }); }
async function applySnap() {
  if (!settings.snap) return; const m = await currentMonitor(); if (!m) return; const bounds = m.size; const pos = { x: bounds.width - (await appWindow.outerSize()).width, y: 0 }; await appWindow.setPosition(pos as any);
}

await loadSettings();
if (location.hash === "#settings") {
  document.body.innerHTML = "";
  document.body.style.background = "rgba(20,20,28,.94)";
  document.body.style.color = "#ddd";
  document.body.style.margin = "0";
  const wrap = document.createElement("div");
  wrap.style.padding = "10px";
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:6px">
      <div style="font-weight:600">Settings / Настройки</div>
      <select id="lang">
        <option value="en" ${settings.lang==='en'?'selected':''}>EN</option>
        <option value="ru" ${settings.lang==='ru'?'selected':''}>RU</option>
      </select>
    </div>
    <label><input type="checkbox" id="showAddr" ${settings.showAddress?'checked':''}/> Show address bar / Показать адресную строку</label><br/>
    <label><input type="checkbox" id="showTabs" ${settings.showTabs?'checked':''}/> Show tabs / Показать вкладки</label><br/>
    <label><input type="checkbox" id="onTop" ${settings.onTop?'checked':''}/> Always on top / Поверх всех окон</label><br/>
    <label><input type="checkbox" id="remember" ${settings.rememberSession?'checked':''}/> Remember last session / Запоминать сессию</label><br/>
    <div>Border width / Толщина рамки: <select id="border"><option>0</option><option>1</option><option>2</option><option selected>3</option></select> px</div>
    <hr/>
    <label><input type="checkbox" id="ribbon" ${settings.ribbon.enabled?'checked':''}/> Narrow ribbon / Узкая лента</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 10px">
      <label>Width/Ширина <input id="rW" value="${settings.ribbon.width}" style="width:70px"/></label>
      <label>Height/Высота <input id="rH" value="${settings.ribbon.height}" style="width:70px"/></label>
    </div>
    <label><input type="checkbox" id="hud" ${settings.hud?'checked':''}/> Click-through (HUD) / Прозрачность для кликов</label><br/>
    <label><input type="checkbox" id="snap" ${settings.snap?'checked':''}/> Snap to edges / Прилипание к краям</label>
    <hr/>
    <button id="clearCache">Clear cache</button>
    <button id="clearHistory">Clear history</button>
  `;
  document.body.appendChild(wrap);
  const $ = (id: string) => document.getElementById(id)! as HTMLInputElement;
  $("lang").onchange = () => { settings.lang = ($("lang").value as Lang); saveSettings(); };
  $("showAddr").onchange = () => { settings.showAddress = $("showAddr").checked; saveSettings(); };
  $("showTabs").onchange = () => { settings.showTabs = $("showTabs").checked; saveSettings(); };
  $("onTop").onchange = async () => { settings.onTop = $("onTop").checked; await appWindow.setAlwaysOnTop(settings.onTop); saveSettings(); };
  $("remember").onchange = () => { settings.rememberSession = $("remember").checked; saveSettings(); };
  $("border").onchange = () => { settings.borderPx = Number($("border").value) as any; setBorderPx(settings.borderPx); saveSettings(); };
  $("ribbon").onchange = async () => { settings.ribbon.enabled = $("ribbon").checked; saveSettings(); if (settings.ribbon.enabled) await applyRibbon(); };
  $("rW").onchange = () => { settings.ribbon.width = Number($("rW").value); saveSettings(); };
  $("rH").onchange = () => { settings.ribbon.height = Number($("rH").value); saveSettings(); };
  $("hud").onchange = async () => { settings.hud = $("hud").checked; saveSettings(); await applyHud(); };
  $("snap").onchange = async () => { settings.snap = $("snap").checked; saveSettings(); await applySnap(); };
  $("clearCache").onclick = async () => { await invoke("clear_cache", { hard: false }); };
  $("clearHistory").onclick = async () => { await invoke("clear_history"); };
} else {
  if (settings.rememberSession) {
    try { const last = await invoke<string>("last_url") as any; if (last) { await navigate(last); } } catch {}
  }
  await applyHud();
  await applySnap();
}
