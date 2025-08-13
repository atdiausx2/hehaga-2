<template>
  <v-app>
    <v-main>
      <v-container>
        <v-row align="center" justify="space-between">
          <v-col cols="12" md="4">
            <v-select v-model="selectedDate" :items="dateOptions" label="Choose a date" outlined dense hide-details></v-select>
          </v-col>
        </v-row>

        <v-card class="mt-4" elevation="2">
          <v-card-text>
            <div id="map" style="height: 600px;"></div>
          </v-card-text>
        </v-card>

      </v-container>
    </v-main>
  </v-app>
</template>


<script>

// import * as XLSX from 'xlsx';
import axios from 'axios';
// import vuetify from 'vuetify';
// vuetify
// export 'vuetify' (imported as 'vuetify') was not found in 'vue' 
import { onMounted, ref, watch, reactive, createApp, h, onBeforeUnmount  } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

import 'vuetify/styles';
import MapInfoCard from '@/components/MapInfoCard.vue';

import '@mdi/font/css/materialdesignicons.css';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

export default {
  setup() {
// options API d
    const selectedDate = ref(new Date().toISOString().slice(0,10));
    const dateOptions = [];
    for(let i=0;i<=14;i++){
      const d = new Date();
      d.setDate(d.getDate()+i);
      dateOptions.push(d.toISOString().slice(0,10));
    }
    const rows = ref([]);
    const map = ref(null);
    const token = ref(null);
    const fileId = ref(null);
    const fullEntries = ref([]);
    const markers = [];


    // --- HOIST these so other functions can use them ---

    let info = null;                 // google.maps.InfoWindow
    let infoContainer = null;        // <div> that hosts the Vue card
    let infoRoot = null;             // the detached Vue app instance
    const infoState = reactive({ r: null, arrivalTime: '' }); // shared reactive state

    onMounted(async ()=>{
      token.value = await getGraphAccessToken();
      console.log(`the value for token is ${token.value}`);
      fileId.value = await findExcelFile(token.value);
      console.log(`this is the file id value ${fileId.value}`)
  
      const usedRange = await getExcelUsedRange(token.value, fileId.value);
      console.log(`this is the used range data, len: ${usedRange.length};  actual data: ${usedRange.values}`)
      const parsedRows = parseExcelRows(usedRange.values);
      console.log(`these are the parsed rows , len: ${parsedRows.length},  actual data: ${parsedRows}`);
      rows.value = parsedRows.filter(r => r['Darbība'] === "Jāapseko");
      console.log(`these are the appropriate rows about future visits, length: ${rows.value.length}, values:  ${rows.value}`)
      // map.value = fileId;

      initMap(); 
      info = new google.maps.InfoWindow();
      infoContainer = document.createElement('div');

      infoRoot = createApp({
        render() {
          return h(MapInfoCard, {
            r: infoState.r,
            arrivalTime: infoState.arrivalTime,
            onClose: () => info.close(),
            async onConfirm() {

              infoState.r['Apsekošanas Datums'] = selectedDate.value;
              infoState.r['Apsekošanas Laiks'] = infoState.arrivalTime;
              await writeToExcelRow(token.value, fileId.value, infoState.r._excelRow, infoState.r);
              info.close(); 
              updateMarkers();
              // use your parent-scoped helpers: selectedDate, writeToExcelRow, token, fileId, updateMarkers
            },
            async onRemove() {
            infoState.r['Darbība'] = 'Nav aktuāli';
            await writeToExcelRow(token.value, fileId.value, infoState.r._excelRow, infoState.r);
            info.close();
            updateMarkers();
            }
          });
        }
      });

      // create a Vuetify instance just for this child app
      const childVuetify = createVuetify({
        components,
        directives,
        icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
      });

      infoRoot.use(childVuetify);
      infoRoot.mount(infoContainer);

      updateMarkers();
    });






onBeforeUnmount(() => {
  info?.close();
  infoRoot?.unmount();
});


function openInfoWindow(r, arrivalTime, marker) {
  infoState.r = r;
  infoState.arrivalTime = arrivalTime;
  info.setContent(infoContainer);
  info.open(map.value, marker);
}

  function initMap(){
    console.log(`initializing map`);
    map.value = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 56.95, lng: 24.1 },
      zoom: 7
    });
    console.log(`map is created`);
 
  }

  // helper (put it near the top of the file)
function circleIcon(hex, offsetX = 14, offsetY = 0) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 10,                // size of the dot
    fillColor: hex,
    fillOpacity: 1,
    strokeColor: '#ffffff',  // thin white ring looks nice on any map
    strokeWeight: 1,
// now adding a label to annotate added points
labelOrigin: new google.maps.Point(offsetX, offsetY)

  };
}

  async function findExcelFile(token) {
  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/users/danat@sungo.lv/drive/root/children`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const file = response.data.value.find(f => f.name.includes("SunGo Rinda Apsekošanai.xlsx"));
  return file?.id;
}

async function writeToExcelRow(token, fileId, rowNum, updatedObj) {
  const sheetName = "Siltumsūkņi";

  // Ensure column order matches the original file
  const orderedHeaders = [
    "Pieteikšanas Datums",
    "Klienta vārds, uzvārds",
    "Pārdevējs īpašnieks",
    "Tel.nr",
    "Darbība",
    "Adrese",
    "Apsekošanas Datums",
    "Apsekošanas Laiks"
  ];

  const rowValues = orderedHeaders.map(h => updatedObj[h] ?? "");
  const rangeAddress = `A${rowNum}:H${rowNum}`; // match column count to headers

  await axios.patch(
    `https://graph.microsoft.com/v1.0/users/danat@sungo.lv/drive/items/${fileId}/workbook/worksheets('${sheetName}')/range(address='${rangeAddress}')`,
    { values: [rowValues] },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function getExcelUsedRange(token, fileId) {
  const sheetName = "Siltumsūkņi";
  const url = `https://graph.microsoft.com/v1.0/users/danat@sungo.lv/drive/items/${fileId}/workbook/worksheets('${sheetName}')/usedRange(valuesOnly=true)?$select=address,values`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

function parseExcelRows(values) {
  const headers = values[0];
  const dataRows = values.slice(1);
  return dataRows.map((row, idx) => {
    const obj = Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]));
    obj._excelRow = idx + 5; 
    return obj;
  });
}

// async function get

async function getGraphAccessToken() {

  const base =  'http://localhost:7071'
  const link_to_obtain_token = `${base}/api/GetToken`
  const { token } = await (await fetch(link_to_obtain_token)).json();
  return token;
}


  async function getDistrict(adrese){
  const GEOCODE_KEY = 'AIzaSyCDJdwMl5ijOs6Cq-lf9IBC5Muc7PHhJqY'; 

  // const GEOC
  const resp = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: { address: adrese, key: GEOCODE_KEY }
  });
  const comps = resp.data.results?.[0]?.address_components ?? null;
  if (!comps) return null;
  const district = comps.find(c=>c.types.includes('administrative_area_level_1'));
  const locality = comps.find(c=>c.types.includes('locality'));


  return district?.long_name || locality?.long_name || null;
}

function regionOfDistrict(d){
      const regions = {
        Vidzeme: [
          'Siguldas novads', 
        'Cēsu novads','Valmieras novads','Limbažu novads','Valkas novads','Smiltenes novads','Alūksnes novads','Madonas novads', 
        'Sigulda Municipality', 'Cēsis Municipality', 'Valmiera Municipality', 'Limbaži Municipality', 'Valka Municipality', 'Smiltene Municipality', 
        'Alūksne Municipality', 'Madona Municipality'
      ],

        Pierīga: [
          'Rīga', 'Riga','Jūrmala','Ādažu novads','Ropažu novads','Ķekavas novads','Ogres novads','Salaspils novads','Saulkrastu novads','Olaines novads','Mārupes novads' , 
          'Ādaži Municipality', 'Ropaži Municipality', 'Ķekava Municipality', 'Ogre Municipality', 'Salaspils Municipality', 'Saulkrasti Municipality', 'Olaine Municipality', 'Mārupe Municipality', 
          'Rīga city', 'Jūrmala city'
        ],
        Kurzeme: ['Talsu novads','Tukuma novads','Kuldīgas novads','Ventspils novads','Dienvidkurzemes novads','Saldus novads','Dobeles novads','Jelgavas novads','Bauskas novads', 
          'Talsi Municipality', 'Tukums Municipality', 'Kuldīga Municipality', 'Ventspils Municipality', 'South Kurzeme Municipality' , 'Saldus Municipality', 'Dobele Municipality', 
          'Jelgava Municipality', 'Bauska Municipality', 'Liepāja', 'Ventspils', 'Liepāja city', 'Ventspils city'
        ],
        Latgale: ['Krāslavas novads','Augšdaugavas novads','Jēkabpils novads','Līvānu novads','Varakļānu novads','Rēzeknes novads','Balvu novads','Aizkraukles novads','Daugavpils', 'Preiļu novads','Ludzas novads', 
        'Krāslava Municipality', 'Augšdaugava Municipality', 'Jēkabpils Municipality', 'Līvāni Municipality', 'Varakļāni Municipality', 'Rēzekne Municipality', 'Balvi Municipality', 'Aizkraukle Municipality',  
          'Preiļi Municipality' , 'Ludza Municipality', 'Daugavpils city'
        ]
      };
      for(const [reg, list] of Object.entries(regions)){
        if(list.includes(d)) return reg;
      }
      return null;
    }



  async function updateMarkers(){
      markers.forEach(m=> m.setMap(null));
      markers.length=0;
      // Original total
      const totalRows = rows.value.length;
      console.log(`number of rows in the beginning  ${totalRows}`); 
      // const fullEntries = rows.value.filter(r => r['Adrese'] !== "");
      fullEntries.value = rows.value.filter(r => {
      const addr = r['Tel.nr'];
        return addr != null && String(addr).trim() !== '';
      });
      // const totalFullEntries = fullEntries.length;
      // console.log(`number of rows in start ${totalFullEntries}`); 
      const scheduled = fullEntries.value.filter(r => r['Apsekošanas Datums'] === selectedDate.value);
      console.log(`the scheduled visits are sik: ${scheduled.length}`);
      const unscheduled = fullEntries.value.filter(r => !r['Apsekošanas Datums']);
      console.log(`the unscheduled visits are sik: ${unscheduled.length}`);
      const scheduledRegions = new Set( );
      // const infoRoot
      // for(const r of )

      for(const r of scheduled){
        r.district = await getDistrict(r.Adrese);
        // console.log(`the district has been established from the address: ${r.district}`);
        r.region = regionOfDistrict(r.district);
        // console.log(`the region has been established from the address: ${r.region}`);
        if (r.region) scheduledRegions.add(r.region);
      }
      console.log(`the established scheduled regions are ${[...scheduledRegions]}, and the length of the unscheduled is ${unscheduled.length}`);
      
      for(const r of unscheduled){
        r.district = await getDistrict(r.Adrese);
        r.region = regionOfDistrict(r.district);
      }

      const GEOCODE_KEY = 'AIzaSyCDJdwMl5ijOs6Cq-lf9IBC5Muc7PHhJqY'; 
      console.log(`querying the geocode`);
      for (const r of fullEntries.value){
        if (!r.region) continue;

        const coords = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          
          params:{  address: r.Adrese, key: GEOCODE_KEY }
        });
        const loc = coords.data.results[0]?.geometry.location || null;
        if (!loc) continue;
        const isScheduledToday = r['Apsekošanas Datums'] === selectedDate.value;
        // console.log(`is scheduled today? ${isScheduledToday} `);
        var withinScheduledRegion = null;
        if (scheduledRegions.size !== 0){ 
          withinScheduledRegion = !isScheduledToday && scheduledRegions.has(r.region);
          // console.log(`within region? ${withinScheduledRegion} , ${r.region}`);
        } else { 
          // console.log('there are none scheduled regions so far');
          withinScheduledRegion = true;
          scheduledRegions.add(r.region);
        }
   
        // console.log(`the new regions list ${[...scheduledRegions]}`);

        const color = isScheduledToday ? 'green' : (withinScheduledRegion ? 'red' : null);

        if (!color) continue;

        const hex = color === 'green' ? '#1e8e3e' : '#d93025'; // pick any greens/reds you like

        const m = new google.maps.Marker({
        position: loc,
        map: map.value,
        icon: circleIcon(hex),
        clickable: true,
        optimized: false, 
        zIndex: isScheduledToday ? 2 : 1  // optional: scheduled on top
      });

        // const m = new google.maps.Marker({
        //   position: loc,
        //   map: map.value,
        //   icon: color === 'green' ? undefined : { labelOrigin: {x:10,y:10}, path: google.maps.SymbolPath.CIRCLE, scale:8, fillColor:'green', fillOpacity:1, strokeWeight:1 }
        // });
          // const info = new google.maps.InfoWindow();
          // console.log('the info window is created');

          m.addListener('click', async ()=>{
          let arrivalTime = r['Apsekošanas Laiks'];

          if(!isScheduledToday){
            // const uns = fullEntries.value.filter(q => (q.Adrese === r.Adrese)&& q['Apsekošanas Laiks']);
            // const uns = fullEntries.value.filter(q => q['Apsekošanas Laiks']);
            const uns = fullEntries.value.filter(q => q['Apsekošanas Laiks']);
            // console.log(`here is the size of the full enrties array: ${uns.length}`);
            let start_time = '09:00';
            let adrese_origin = null ; 
            let aux_addendum_time = 0;
            // import.meta.env.VITE_API_BASE ??
            const base =  'http://localhost:7071';
            if (uns.length){ 
              const latest = [...uns].sort((a, b) =>
                a['Apsekošanas Laiks'] < b['Apsekošanas Laiks'] ? -1 : 1
              ).pop();
              // const latest = uns.sort((a,b)=> a['Apsekošanas Laiks']<b['Apsekošanas Laiks']?-1:1).pop();
              adrese_origin = latest.Adrese;
              start_time = latest['Apsekošanas Laiks'];
              aux_addendum_time = 60;
            }
            else { 
              adrese_origin = 'Sāremas iela 1A, LV-1005, Rīga';
               start_time = '09:00';
               aux_addendum_time = 0;
            }


            const url_link_query = `${base}/api/GetDirections?r_origin=${encodeURIComponent(adrese_origin)}&r_destination=${encodeURIComponent(r.Adrese)}`;
            const res = await fetch(url_link_query, { headers: { Accept: 'application/json' } });

            if (!res.ok) throw new Error(`GetDirections failed: ${res.status} ${await res.text()}`);

            const { laiks: driveMin } = await res.json();
            // console.log(`now queried the address`);

            const est = new Date(`${selectedDate.value}T${start_time}`);

            
            est.setMinutes(est.getMinutes() + driveMin*1.1 + aux_addendum_time);
            arrivalTime = est.toTimeString().slice(0,5);
          }
          else {
            arrivalTime = r['Apsekošanas Laiks'];
          }
          openInfoWindow(r, arrivalTime || '09:00', m)


          // const content = `
          //   <div>
          //     <button style="float:right" onclick="this.parentNode.parentNode.close()">×</button>
          //     <p>Pieteikšanas Datums: ${r['Pieteikšanas Datums']}</p>
          //     <p>Klients: ${r['Klienta vārds, uzvārds']}</p>
          //     <p>Pārdevējs: ${r['Pārdevējs īpašnieks']}</p>
          //     <p>Tel.nr: ${r['Tel.nr']}</p>
          //     <p>Apsekošanas Laiks: ${arrivalTime}</p>
          //     <p>Klienta adrese: ${r.Adrese}
          //     <button id="confirm">Confirm</button>
          //     <button id="remove">Remove</button>
          //   </div>`;
          // info.setContent(content);
          // info.open(map.value, m);

          // window.setTimeout(()=>{
          //   document.getElementById('confirm').onclick = async ()=>{
          //     r["Apsekošanas Datums"] = selectedDate.value;
          //     r["Apsekošanas Laiks"] = arrivalTime;
              // row["Apsekošanas Datums"] = selectedDate.value;
              // row["Apsekošanas Laiks"] = arrivalTime;
        //       await writeToExcelRow(token, fileId, r._excelRow, r);
        //       info.close();
        //       updateMarkers(); // refresh view if needed
        //       // r['Apsekošanas Datums'] = selectedDate.value;
        //       // r['Apsekošanas Laiks'] = arrivalTime;
        //       // rewrite Excel row back to sheet & save file
        //     };
        //     document.getElementById('remove').onclick = async ()=>{
        //       r["Darbība"] = "Nav aktuāli";
        //       await writeToExcelRow(token, fileId, r._excelRow, r);
        //       info.close();
        //       updateMarkers(); 
        //       // r.Darbība = 'Nav aktuāli';
        //       // rewrite Excel and save
        //     };
        //   },
        //   100
        // );
        });
        
        // console.log(`marker is appended logically to the list of markers `);
        markers.push(m);
      }
    }

    watch(selectedDate, updateMarkers);

    return { selectedDate, dateOptions };
  }
  
};
</script>
