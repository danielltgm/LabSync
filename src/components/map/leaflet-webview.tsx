import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import type { LabMapProps } from './types';
import { DEFAULT_ZOOM, labPins } from './types';

// The class typings resolve props to `never` under React 19 types; use a plain component type.
const WebViewView = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebView> }>;

/*
 * Android fallback when no Google Maps API key is configured: the same Leaflet + OpenStreetMap
 * map as the web build, running inside a WebView. Google Maps on Android crashes without a key,
 * so this keeps the Peta tab and lab editor usable in preview APKs.
 * Props are pushed into the page with injectJavaScript; taps and drags come back via postMessage.
 */

const COLORS = { live: '#F2684D', selected: '#6B66F0', idle: '#1E1E1E', ink: '#1B1B1B', user: '#A6E4EF' };

const HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#m{height:100%;margin:0;background:#D3E1D8}
body.dark,body.dark #m{background:#141414}
body.dark .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.85) contrast(.9)}
.leaflet-control-attribution{font-size:9px}
</style></head><body><div id="m"></div><script>
var C=${JSON.stringify(COLORS)};
var map=L.map('m',{zoomControl:false}).setView([-7.0487,110.4413],17);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var layer=L.layerGroup().addTo(map);var lastFocus=null;
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))}
function pin(label,color,big){var s=big?46:38;return L.divIcon({className:'',iconSize:[s,s+10],iconAnchor:[s/2,s+8],
 html:'<div style="display:flex;flex-direction:column;align-items:center"><div style="width:'+s+'px;height:'+s+'px;border-radius:'+s/2+'px;background:'+color+';border:3px solid '+C.ink+';display:flex;align-items:center;justify-content:center;color:#fff;font:700 '+(big?13:11)+'px monospace">'+label+'</div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid '+C.ink+';margin-top:-1px"></div></div>'})}
map.on('click',function(e){post({type:'tap',lat:e.latlng.lat,lng:e.latlng.lng})});
window.update=function(s){
 document.body.className=s.dark?'dark':'';layer.clearLayers();
 (s.labs||[]).forEach(function(l){var busy=l.busy,sel=l.selected;
  var col=busy?C.live:sel?C.selected:C.idle;
  L.circle([l.lat,l.lng],{radius:l.radiusM,color:col,weight:sel?3:1.5,fillColor:col,fillOpacity:sel?.18:.08,dashArray:sel?null:'4 4'}).addTo(layer);
  L.marker([l.lat,l.lng],{icon:pin(l.label,col,sel)}).on('click',function(){post({type:'select',id:l.nextId})}).addTo(layer);});
 if(s.editing){var e=s.editing;
  L.circle([e.lat,e.lng],{radius:e.radiusM,color:C.selected,weight:3,fillColor:C.selected,fillOpacity:.18}).addTo(layer);
  L.marker([e.lat,e.lng],{draggable:true,icon:pin('LAB',C.live,true)}).on('dragend',function(ev){var p=ev.target.getLatLng();post({type:'move',lat:p.lat,lng:p.lng})}).addTo(layer);}
 if(s.user){L.circleMarker([s.user.lat,s.user.lng],{radius:9,color:C.ink,weight:3,fillColor:C.user,fillOpacity:1}).addTo(layer);}
 var key=String(s.focusKey);
 if(s.focus&&key!==lastFocus){var first=lastFocus===null;lastFocus=key;
  var sz=map.getSize(),z=s.focus.zoom||map.getZoom(),tr=map.project([s.focus.lat,s.focus.lng],z).distanceTo(map.project(map.getCenter(),z));if(first||!sz.x||!sz.y||tr<1)map.setView([s.focus.lat,s.focus.lng],s.focus.zoom||${DEFAULT_ZOOM});else map.flyTo([s.focus.lat,s.focus.lng],s.focus.zoom||map.getZoom(),{duration:.6});}
};
post({type:'ready'});
</script></body></html>`;

export function LeafletWebView({ labs, selectedId, onSelectLab, user, busyLabIds = [], editing, focus, focusKey, dark }: LabMapProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const target = focus ?? (editing ? { lat: editing.lat, lng: editing.lng, zoom: DEFAULT_ZOOM } : labs[0] ? { lat: labs[0].lat, lng: labs[0].lng, zoom: DEFAULT_ZOOM - 1 } : null);

  // A string, so the effect below only re-injects when something actually changed.
  const payload = JSON.stringify({
    labs: labPins(labs, selectedId, busyLabIds),
    busy: busyLabIds,
    selected: selectedId ?? null,
    editing: editing ? { lat: editing.lat, lng: editing.lng, radiusM: editing.radiusM } : null,
    user: user ? { lat: user.lat, lng: user.lng } : null,
    focus: target,
    focusKey: focusKey ?? 0,
    dark: !!dark,
  });

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.update(${payload});true;`);
  }, [ready, payload]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type: string; id?: string; lat?: number; lng?: number };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'select' && msg.id && !editing) onSelectLab?.(msg.id);
    else if ((msg.type === 'tap' || msg.type === 'move') && editing && msg.lat !== undefined && msg.lng !== undefined) {
      editing.onMove({ lat: msg.lat, lng: msg.lng });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#141414' : '#D3E1D8' }}>
      <WebViewView
        ref={ref}
        originWhitelist={['*']}
        // A real origin so OpenStreetMap's tile servers accept the requests (they require a Referer).
        source={{ html: HTML, baseUrl: 'https://labsync.app/' }}
        onMessage={onMessage}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        domStorageEnabled
      />
    </View>
  );
}
