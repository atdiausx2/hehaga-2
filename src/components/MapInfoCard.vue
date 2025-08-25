<template>
    <v-card v-if="r" rounded="xl" elevation="6" max-width="380" class="info-card">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Vizītes dati</span>
      </v-card-title>
  
      <v-divider />
  
      <v-card-text class="pt-2">
        <v-list density="compact">
          <v-col cols="6">
      <div class="field">
        <div class="field-title">Klients</div>
        <div class="field-sub">{{ r['Klienta vārds, uzvārds'] || '' }}</div>
      </div>
    </v-col>
    <v-col cols="6">
      <div class="field">
        <div class="field-title">Pārdevējs</div>
        <div class="field-sub">{{ r['Pārdevējs īpašnieks'] || '' }}</div>
      </div>
    </v-col>

    <v-col cols="6">
      <div class="field">
        <div class="field-title">Tel.nr</div>
        <div class="field-sub">{{ r['Tel.nr'] || '' }}</div>
      </div>
    </v-col>
    <v-col cols="6">
      <div class="field">
        <div class="field-title">Produkta tips:</div>
        <div class="field-sub">{{ r['Komentārs, kas nepieciešams klientam'] || '' }}</div>
      </div>
    </v-col>
          <!-- <v-list-item title="Klients" :subtitle="r['Klienta vārds, uzvārds'] || ''" />
          <v-list-item title="Pārdevējs" :subtitle="r['Pārdevējs īpašnieks'] || ''" />
          <v-list-item title="Tel.nr" :subtitle="r['Tel.nr'] || ''" />
          <v-list-item title="Produkta tips:" :subtitle="r['Komentārs, kas nepieciešams klientam'] || ''" /> -->
          <v-list-item class="clamp" style="--clamp: 6"                v-if="r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem']" title="Komentārs:"
  :subtitle="r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem']">

            <template #subtitle>
              <div :class="['comment-subtitle', { expanded: showFullComment }]">
                {{ r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem'] }}
              </div>
            </template>

          </v-list-item>


          <v-list-item
            :title="r && r['Apsekošanas Laiks'] ? 'Ieplānotais apsekošanas Laiks' : 'Iespējamais apsekošanas Laiks'"
          >
            <template #subtitle>
              <div class="time-row">
                <v-select
                  v-model="hour"
                  :items="hours"
                  label="Stundas"
                  density="compact"
                  hide-details
                  variant="outlined"
                  class="time-select"
                />
                <span class="time-colon">:</span>
                <v-select
                  v-model="minute"
                  :items="minutes"
                  label="Minūtes"
                  density="compact"
                  hide-details
                  variant="outlined"
                  class="time-select"
                  @update:modelValue="emitIfComplete"
                />
                <!-- <v-btn
                  class="ml-2"
                  size="x-small"
                  color="primary"
                  :disabled="!hour || !minute"
                  @click="confirmUserTime"
                >
                  Apstiprināt
                </v-btn> -->
              </div>
              <!-- <div class="mt-1" v-if="selectedTime">
                <v-chip size="x-small" label color="primary">{{ selectedTime }}</v-chip>
                <span class="ml-2 text-caption text-medium-emphasis">(priekšskatījums)</span>
              </div> -->
            </template>
          </v-list-item>


          <!-- <v-list-item v-if="!r['Apsekošanas Laiks']" title="Iespējamais apsekošanas Laiks">
            <template #subtitle>
              <v-chip color="primary" size="small" label>{{ arrivalTime || '' }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item v-if="r && r['Apsekošanas Laiks']" title="Ieplānotais apsekošanas Laiks">
            <template #subtitle>
              <v-chip color="primary" size="small" label>{{ arrivalTime || '' }}</v-chip>
            </template>
          </v-list-item> -->
          <v-list-item title="Klienta adrese" :subtitle="r.Adrese || ''" />
        </v-list>
      </v-card-text>

      <v-divider />
      <v-card-actions class="justify-end">

        <v-btn color="primary" size="small" v-if="!r['Apsekošanas Laiks']" @click="$emit('confirm')">Apstiprināt</v-btn>  
        <v-btn
            variant="tonal"
            color="error"
            size="small"
            v-if="r && r['Apsekošanas Laiks']"
            @click="$emit('cancelTime')"
          >
            ATCELT ŠO LAIKU
          </v-btn>
          <v-btn variant="tonal" color="error" size="small" @click="$emit('remove')">Dzēst Objektu</v-btn>
     </v-card-actions>
    </v-card>

            <!-- optional: tiny placeholder while r is null -->
        <v-card v-else rounded="xl" elevation="2" max-width="380">
          <v-card-text>Loading…</v-card-text>
        </v-card>
  </template>
  
  <script>

export default {
  name: 'MapInfoCard',
  props: {
    r: { type: Object,  default: null},
    arrivalTime: { type: String, default: ''}
  },
  emits: ['close', 'confirm', 'remove', 'cancelTime', 'setTime'], 
  data() {
    return { 
      showFullComment: false,
      hour: null,
      minute: null,
      hours: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
      minutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
    };
  }, 
  computed: {
    selectedTime() {
      return this.hour && this.minute ? `${this.hour}:${this.minute}` : '';
    }
  },

  watch: {
    // If parent recomputes arrivalTime, reflect it here
    arrivalTime: {
      immediate: true,
      handler(val) {
        const t = this.parseTime(val) || this.parseTime(this.r?.['Apsekošanas Laiks']);
        if (t) {
          this.hour = t.hh;
          this.minute = t.mm;
        } else {
          // default to nearest next 15-min slot if nothing provided
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(Math.ceil(now.getMinutes() / 15) * 15).padStart(2, '0').replace('60', '00');
          this.hour = hh;
          this.minute = mm;
        }
        this.emitIfComplete();
      }
    }
  },

  methods: {
    parseTime(s) {
      if (!s || typeof s !== 'string') return null;
      const m = s.match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      // let [_, hh, mm] = m;
      const hh = Math.min(23, Math.max(0, +m[1]));
      const mm = Math.min(59, Math.max(0, +m[2]));
      // if (+hh < 0 || +hh > 23) return null;
      // if (+mm < 0 || +mm > 59) return null;
      return { hh: String(hh).padStart(2, '0'), mm: String(mm).padStart(2, '0')  };
    },

    emitIfComplete() {
      if (this.hour != null && this.minute != null) {
        this.$emit('setTime', `${this.hour}:${this.minute}`);
      }
    }


    // confirmUserTime() {
    //   if (!this.selectedTime) return;
    //   // Emit to parent (e.g., to save/update r['Apsekošanas Laiks'])
    //   // console.log('')
    //   this.$emit('setTime', this.selectedTime);
    // }
  }
};


  </script>



  <style scoped>
/*   min-height: calc(1.25rem * 4);        /* reserve 4 lines when present */ 
.comment-subtitle {
  line-height: 1.25rem;

  max-height: calc(1.25rem * 6);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
}
.comment-subtitle.expanded {
  max-height: none;
  -webkit-line-clamp: unset;
  overflow: visible;
}


.field-title {
  font-weight: 500;
  font-size: 0.85rem;
  margin-bottom: 2px;
}
.field-sub {
  font-size: 0.8rem;
  line-height: 1.2;
  word-break: break-word;
}



.time-row {
  display: flex;
  align-items: center;
}
.time-select {
  width: 90px;           /* compact width for hour/min */
}
.time-colon {
  display: inline-block;
  padding: 0 4px;
}



  /* allow wrapping for all list-item text inside this component */
:deep(.v-list-item-title),
:deep(.v-list-item-subtitle) {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
  word-break: break-word; /* break long words/URLs if needed */
}

/* avoid hidden overflow on the content wrapper */
:deep(.v-list-item .v-list-item__content) {
  overflow: visible !important;
}

/* OPTIONAL: prevent a single field from growing “forever”.
   Clamp to N lines (default 4) but still wrap inside those lines. */
:deep(.info-card .clamp .v-list-item-title),
:deep(.info-card .clamp .v-list-item-subtitle) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--clamp, 4); /* change per item via inline style */
  overflow: hidden;
}
  

.info-card {
  display: flex;
  flex-direction: column;
  max-height: 70vh;          
}

 :deep(.info-card .v-card-text) {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;  
}

/* Make every list item text wrap and break long tokens */
/* :deep(.info-card .v-list-item) {
  align-items: flex-start; 
} */

/* Keep actions always visible; no sticky needed in grid */
.info-card :deep(.v-card-actions) {
  background: var(--v-theme-surface);
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.08);
  flex-shrink: 0;
}


</style>