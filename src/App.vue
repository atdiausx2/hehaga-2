<template>
  <v-app>
    <v-main>
      <v-container>
        <v-row align="center" justify="space-between">
          <v-col cols="12" md="4">
            <v-select v-model="selectedDate" :items="dateOptions" label="Choose a date" outlined dense hide-details></v-select>
          </v-col>

          <v-col cols="12" md="4">
            <span>Ieplānotie reģioni: {{ scheduledRegionsArray.length ? scheduledRegionsArray.join(', ') : '—' }}</span>
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

    const scheduledRegionsArray = ref([]); 
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
    let infoCurrentMarker = null;
    let infoCurrentWasScheduled = false;
    const infoState = reactive({ r: null, arrivalTime: '' }); // shared reactive state

    onMounted(async ()=>{
      token.value = await getGraphAccessToken();
      console.log(`the value for token is ${token.value}`);
      fileId.value = await findExcelFile(token.value);
      console.log(`this is the file id value ${fileId.value}`)
  
      const usedRange = await getExcelUsedRange(token.value, fileId.value);
      // console.log(`this is the used range data, len: ${usedRange.length};  actual data: ${usedRange.values}`)
      const parsedRows = parseExcelRows(usedRange.values);
      // console.log(`these are the parsed rows , len: ${parsedRows.length},  actual data: ${parsedRows}`);
      rows.value = parsedRows.filter(r => r['Darbība'] === "Jāapseko");
      // console.log(`these are the appropriate rows about future visits, length: ${rows.value.length}, values:  ${rows.value}`)
      // map.value = fileId;

      initMap(); 
      info = new google.maps.InfoWindow();
      infoContainer = document.createElement('div');

      infoRoot = createApp({
        render() {
          return h(MapInfoCard, {
            r: infoState.r,
            arrivalTime: infoState.arrivalTime,
            onClose: () => { 
              if (infoCurrentWasScheduled) restoreScheduledLabel(infoCurrentMarker);
              info.close();
            },
            async onConfirm() {
              try { 
                infoState.r['Apsekošanas Datums'] = selectedDate.value;
                infoState.r['Apsekošanas Laiks'] = infoState.arrivalTime;
                // console.log(`writing to this ecxel row the excel row, ${infoState.r._excelRow}, info State ${infoState.r['Apsekošanas Datums']}, ${infoState.r['Apsekošanas Laiks']}`);
                await writeToExcelRow(token.value, fileId.value, infoState.r._excelRow-3, infoState.r);
              } catch (e) {
                console.error('Failed to cancel time:', e);
              } finally { 
                info.close(); 
                await updateMarkers();
              }
              // updateMarkers will recreate markers/labels anyway
              // use your parent-scoped helpers: selectedDate, writeToExcelRow, token, fileId, updateMarkers
            },
            async onCancelTime() {
            try {
            infoState.r['Apsekošanas Datums'] = '';
            infoState.r['Apsekošanas Laiks'] = '';
            await writeToExcelRow(token.value, fileId.value, infoState.r._excelRow - 3, infoState.r);
          } catch (e) {
            console.error('Failed to cancel time:', e);
          } finally {
            info.close();
            await updateMarkers(); // re-draw; marker becomes red
            }},

            async onRemove() {
              try { 
                infoState.r['Darbība'] = 'Nav aktuāli';
                infoState.r['Apsekošanas Laiks'] = '';
                infoState.r['Apsekošanas Datums'] = '';
                await writeToExcelRow(token.value, fileId.value, infoState.r._excelRow-3, infoState.r);
              } catch (e) {
                console.error('Failed to cancel time:', e);
              } finally { 
                info.close();
                await updateMarkers();
              }
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

function isRowScheduledForSelected(row) {
  let cell = row['Apsekošanas Datums'];
  if (typeof cell === 'number') cell = excelDateToISO(cell); // -> "YYYY-MM-DD"
  return (cell ?? '').toString().trim() === selectedDate.value;
}

function excelDateToISO(n) {
  // Excel's day 1 is 1900-01-01 (with an off-by-1 for 1900 leap year bug)
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const d = new Date(excelEpoch.getTime() + n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function isoToExcelDate(isoString) {
  // Accept either ISO string or Date
  const d = typeof isoString === 'string' ? new Date(isoString) : new Date(isoString);

  // Excel epoch: 1899-12-30 (because of the leap year bug in Excel's system)
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));

  // Difference in days
  const diffMs = d.getTime() - excelEpoch.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return Math.floor(diffDays);
}



function openInfoWindow(r, arrivalTime, marker, wasScheduled) {
  infoCurrentMarker = marker;
  infoCurrentWasScheduled = !!wasScheduled;
  infoState.r = r;
  infoState.arrivalTime = arrivalTime;
  info.setContent(infoContainer);
  info.open(map.value, marker);

    // restore the tiny label if user clicks the native “X”
    google.maps.event.addListenerOnce(info, 'closeclick', () => {
    if (infoCurrentWasScheduled) restoreScheduledLabel(infoCurrentMarker);
    infoCurrentMarker = null;
    infoCurrentWasScheduled = false;
  });
}

  function initMap(){
    console.log(`initializing map`);
    map.value = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 56.95, lng: 24.1 },
      zoom: 7
    });
    console.log(`map is created`);
 
  }

function applyScheduledLabel(marker, timeText) {
  marker.set('schedLabel', timeText); // store for later
  marker.setLabel({
    text: timeText,
    color: '#202124',
    fontSize: '12px',
    fontWeight: '600'
  });
}

function restoreScheduledLabel(marker) {
  const t = marker.get('schedLabel');
  if (t) applyScheduledLabel(marker, t);
}




  // helper (put it near the top of the file)
function circleIcon(hex, offsetX = 3, offsetY = -1) {
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
    // a b c d e f g h i j k l m n
    "Pieteikšanas Datums",
    "Pārdevējs īpašnieks",
    "Klienta vārds, uzvārds",
    "Adrese",
    "Tel.nr",
    "Komentārs, kas nepieciešams klientam",
    "Darbība",
    "Plānotais Apsekošanas Datums",
    "Pārdevēja Komentārs , par klienta iespējamajiem laikiem",
    "Pārdošanas menedžera Komentārs",
    "Apsekošanas Datums",
    "Darbība pēc apsekošanas",
    "Komentārs, info priekš pārdevēja pēc apsekošanas",
    "Apsekošanas Laiks"
    // 14 fields
  ];

  const rowValues = orderedHeaders.map(h => updatedObj[h] ?? "");

  // const rangeAddress = `A${rowNum}:H${rowNum}`; // match column count to headers
  const rangeAddress = `A${rowNum}:N${rowNum}`; 
  // match column count to headers

  console.log(`the values to write in ${JSON.stringify(rowValues)}`);

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
  // const link_to_obtain_token = `${base}/api/GetToken`
  const link_to_obtain_token = `/api/GetToken`;
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


  function toHHMM(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'number') return dayFractionToTime(value); // Excel fraction -> "HH:MM"
    const s = String(value).trim();
    const m = s.match(/^(\d{1,2}):([0-5]\d)$/); // "H:MM" or "HH:MM"
    if (m) return m[1].padStart(2, '0') + ':' + m[2];
    const n = parseFloat(s);
    if (!isNaN(n) && n >= 0 && n < 1) return dayFractionToTime(n); // handle "0.48" strings just in case
    return '';
  }

  function toMinutes(v) {
  if (v == null || v === '') return -Infinity;
  if (typeof v === 'number') return Math.round(v * 24 * 60); // Excel fraction
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const n = parseFloat(s);
  if (!isNaN(n) && n >= 0 && n < 1) return Math.round(n * 24 * 60);
  return -Infinity; // unknown format -> sort to bottom
}

    function dayFractionToTime(fraction) {
    // Accept string or number
    const num = parseFloat(fraction);
    if (isNaN(num)) return "";

    // Total minutes in the day
    const totalMinutes = Math.round(num * 24 * 60);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Format HH:MM
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
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

      const datePerceived = new Date(selectedDate.value);
      const day = String(datePerceived.getDate()).padStart(2, '0');
      const month = String(datePerceived.getMonth() + 1).padStart(2, '0'); // months are 0-based
      const year = datePerceived.getFullYear();
      const DateFormatted = `${day}.${month}.${year}`;
      // const totalFullEntries = fullEntries.length;
      console.log(`formatted date to be filtered for ${DateFormatted}`); 
      // const scheduled = fullEntries.value.filter(r => r['Apsekošanas Datums'] === DateFormatted);
    //   const scheduled = fullEntries.value.filter(r => {
    //   const cell = r['Apsekošanas Datums'];
    //   const cellStr = (cell ?? '').toString().trim();
    //   return cellStr === DateFormatted;
    // });
     const scheduled = fullEntries.value.filter(isRowScheduledForSelected);

      // const scheduled = fullEntries.value.filter(r => {
      //   let cell = r['Apsekošanas Datums'];
      //   if (typeof cell === 'number') {
      //     cell = excelDateToISO(cell);
      //   }
      //   const cellStr = (cell ?? '').toString().trim();
      //   return cellStr === selectedDate.value;
      // });
      // const scheduled =  fullEntries.value.filter(r => r['Apsekošanas Laiks']);
      // const scheduled =  fullEntries.value.filter(r => r['Apsekošanas Datums']);
      console.log(`the scheduled visits are sik: ${scheduled.length}`);
      const unscheduled = fullEntries.value.filter(r => !r['Apsekošanas Datums']);
      console.log(`the unscheduled visits are sik: ${unscheduled.length}`);
      const scheduledRegions = new Set();

      for(const r of scheduled){
        r.district = await getDistrict(r.Adrese);
        // console.log(`the district has been established from the address: ${r.district}, apsek. date: ${r['Apsekošanas Datums']}`);
        r.region = regionOfDistrict(r.district);
        // console.log(`the region has been established from the address: ${r.region}`);
        if (r.region) scheduledRegions.add(r.region);
      }
      console.log(`the established scheduled regions are ${[...scheduledRegions]}, and the length of the unscheduled addresses is ${unscheduled.length}`);

    
      
      for(const r of unscheduled){
        r.district = await getDistrict(r.Adrese);
        r.region = regionOfDistrict(r.district);
      }

      // 👉 build counts by region
      const regionCounts = {
        Kurzeme: 0,
        "Pierīga": 0,
        Vidzeme: 0,
        Latgale: 0,
      };

      for (const r of unscheduled) {
        regionCounts[r.region]++;
    }
    let maxRegion = null;
    let maxCount = -1;

    for (const [region, count] of Object.entries(regionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxRegion = region;
      }
    }

      var visitingRegions = new Set();
      // console.log(`unscheduled counts by region: ${regionCounts}, and the top region by no. of addresses ${maxRegion}`);
      // const 
      if (!scheduledRegions.size){
        // console.log(' we are going first block');
         visitingRegions.add(maxRegion);
        //   new Set(maxRegion);--- returns array of symboldsl
      }
      else {
        // console.log('we are going second block');
         visitingRegions = scheduledRegions;
      }

      // const regions =[...visitingRegions];
      scheduledRegionsArray.value = Array.from(visitingRegions);
      const GEOCODE_KEY = 'AIzaSyCDJdwMl5ijOs6Cq-lf9IBC5Muc7PHhJqY'; 
      console.log(`the established regions for visitation are , length ${visitingRegions.length}, are ${[...visitingRegions]}, and the length of the unscheduled addresses is ${unscheduled.length}`);
      for (const r of fullEntries.value){

        
        // const isScheduledToday = r['Apsekošanas Datums'] === selectedDate.value;
        // console.log(`the selected value ${DateFormatted}`);
        // const isScheduledToday = excelDateToISO(r['Apsekošanas Datums']) === selectedDate.value;
        const isScheduledToday = isRowScheduledForSelected(r);
        // r['Apsekošanas Datums'] === isoToExcelDate(selectedDate.value);

        // console.log(`is scheduled today? ${isScheduledToday} `);
        if (!r.region) continue;

        const coords = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          
          params:{  address: r.Adrese, key: GEOCODE_KEY }
        });
        
        const loc = coords.data.results[0]?.geometry.location || null;
        if (!loc) continue;
        // console.log(`the selected value ${selectedDate.value}`)
        var withinScheduledRegion = null;
        withinScheduledRegion = !isScheduledToday && visitingRegions.has(r.region);
        // console.log(`within region? ${withinScheduledRegion} , ${r.Adrese}, region ${r.region}, scheduled date ${r['Apsekošanas Datums']}, is scheduled today ${isScheduledToday}`);
        

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

      // ✅ show reduced popup (time label) for scheduled markers immediately
      if (isScheduledToday) {
        // const t = (dayFractionToTime(r['Apsekošanas Laiks']) || '').toString().slice(0,5);
        // applyScheduledLabel(m, t);
        applyScheduledLabel(m, toHHMM(r['Apsekošanas Laiks']));
      }

        // const m = new google.maps.Marker({
        //   position: loc,
        //   map: map.value,
        //   icon: color === 'green' ? undefined : { labelOrigin: {x:10,y:10}, path: google.maps.SymbolPath.CIRCLE, scale:8, fillColor:'green', fillOpacity:1, strokeWeight:1 }
        // });
          // const info = new google.maps.InfoWindow();
          // console.log('the info window is created');

          m.addListener('click', async ()=>{
          let arrivalTime = r['Apsekošanas Laiks'];

          if (!isScheduledToday) {
            // const uns = fullEntries.value.filter(q => (q.Adrese === r.Adrese)&& q['Apsekošanas Laiks']);
            // const uns = fullEntries.value.filter(q => q['Apsekošanas Laiks']);

            // const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
            // && timePattern.test(q['Apsekošanas Laiks']) &&
            // const uns = fullEntries.value.filter(q => (q['Apsekošanas Laiks']) && (q['Apsekošanas Laiks'] !== 'Aizpilda Apsekotājs'));
            //  q['Apsekošanas Datums'] === isoToExcelDate(selectedDate.value)
            const uns = fullEntries.value.filter(q => (q['Apsekošanas Laiks']) && isRowScheduledForSelected(q));
            console.log(`here is the size of the full enrties array: ${uns.length}`);
            let start_time = '09:00';
            let adrese_origin = null ; 
            let aux_addendum_time = 0;
            // console.log(`here are the times for visitations of the lines already selected ${[...uns['Apsekošanas Laiks']]}`)
            if (uns.length){ 
              // const latest = [...uns].sort((a, b) =>
              //   a['Apsekošanas Laiks'] < b['Apsekošanas Laiks'] ? -1 : 1
              // ).pop();
              const latest = uns.reduce((a, b) =>
              toMinutes(a['Apsekošanas Laiks']) > toMinutes(b['Apsekošanas Laiks']) ? a : b
            );
              // const latest = uns.sort((a,b)=> a['Apsekošanas Laiks']<b['Apsekošanas Laiks']?-1:1).pop();
              adrese_origin = latest.Adrese;
              if (latest['Apsekošanas Laiks'] < 1){ 
                start_time = toHHMM(latest['Apsekošanas Laiks']) || '09:00';
              } 
              else { 
                start_time = latest['Apsekošanas Laiks'];
              }

              // start_time = latest['Apsekošanas Laiks'];
              aux_addendum_time = 60;
            }
            else { 
              adrese_origin = 'Sāremas iela 1A, LV-1005, Rīga';
               start_time = '09:00';
               aux_addendum_time = 0;
            }

// const url_link_query = `${base}/api/GetDirections?r_origin=${encodeURIComponent(adrese_origin)}&r_destination=${encodeURIComponent(r.Adrese)}`;
            const url_link_query = `/api/GetDirections?r_origin=${encodeURIComponent(adrese_origin)}&r_destination=${encodeURIComponent(r.Adrese)}`;
            const res = await fetch(url_link_query, { headers: { Accept: 'application/json' } });

            if (!res.ok) throw new Error(`GetDirections failed: ${res.status} ${await res.text()}`);

            const { laiks: driveMin } = await res.json();
            
            const local_time_string = `${selectedDate.value}T${start_time}`;
            console.log(`the local time string is ${local_time_string}`);
            const est = new Date(local_time_string);
            console.log(`now obtinaed the time we can could ${est}`);
            
            est.setMinutes(est.getMinutes() + driveMin*1.1 + aux_addendum_time);
            arrivalTime = est.toTimeString().slice(0,5);
            
          }
          else {
            // arrivalTime = r['Apsekošanas Laiks'];
            arrivalTime = dayFractionToTime(r['Apsekošanas Laiks']);
            // console.log(`the apsekosana laiks ${r['Apsekošanas Laiks']} is ${arrivalTime}`)
          }
          openInfoWindow(r, arrivalTime || '09:00', m, isScheduledToday);

        });
        
        // console.log(`marker is appended logically to the list of markers `);
        markers.push(m);
      }
    }

    watch(selectedDate, updateMarkers);

    return { selectedDate, dateOptions, scheduledRegionsArray  };
  }
  
};
</script>
