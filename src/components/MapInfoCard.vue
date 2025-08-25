<template>
    <v-card v-if="r" rounded="xl" elevation="6" max-width="380" class="info-card">
      <v-card-title class="d-flex align-center justify-space-between">
        <!-- <span>Vizītes dati</span> -->
        <span class="header-title">Vizītes dati</span>
        <v-spacer />
        <div class="header-actions">
        <v-btn
        color="primary"
        size="small"
        v-if="!r['Apsekošanas Laiks']"
        @click="$emit('confirm')"
      >
        Apstiprināt
      </v-btn>

      <v-btn
        variant="tonal"
        color="error"
        size="small"
        v-if="r && r['Apsekošanas Laiks']"
        @click="$emit('cancelTime')"
      >
        ATCELT ŠO LAIKU
      </v-btn>

      <v-btn
        variant="tonal"
        color="error"
        size="small"
        @click="$emit('remove')"
      >
        Dzēst Objektu
      </v-btn>
    </div>


      </v-card-title>
  
      <v-divider />
  
      <v-card-text class="pt-2">
        <v-list density="compact">
          <v-row dense> 
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
    <button
      class="field-sub copyable"
      type="button"
      :aria-label="`Nokopēt tālruņa numuru ${r['Tel.nr'] || ''}`"
      @click="copyValue(r['Tel.nr'] || '', 'Tālruņa numurs')"
    >
      <span class="truncate-wrap">{{ r['Tel.nr'] || '' }}</span>
      <v-icon size="14" icon="mdi-content-copy" class="ml-1" />
    </button>
  </div>
</v-col>


    <!-- <v-col cols="6">
      <div class="field">
        <div class="field-title">Tel.nr</div>
        <div class="field-sub">{{ r['Tel.nr'] || '' }}</div>
      </div>
    </v-col> -->
    <v-col cols="6">
      <div class="field">
        <div class="field-title">Produkta tips:</div>
        <div class="field-sub">{{ r['Komentārs, kas nepieciešams klientam'] || '' }}</div>
      </div>
    </v-col>
          </v-row>
          <!-- <v-list-item title="Klients" :subtitle="r['Klienta vārds, uzvārds'] || ''" />
          <v-list-item title="Pārdevējs" :subtitle="r['Pārdevējs īpašnieks'] || ''" />
          <v-list-item title="Tel.nr" :subtitle="r['Tel.nr'] || ''" />
          <v-list-item title="Produkta tips:" :subtitle="r['Komentārs, kas nepieciešams klientam'] || ''" /> -->
          <!-- class="clamp" style="--clamp: 6"  -->
          <v-list-item v-if="r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem']" title="Komentārs:">
<!--   :subtitle="r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem']" -->
              <template #subtitle>
                <v-textarea
                                  v-model="commentDraft"
                                  variant="outlined"
                                  density="compact"
                                  auto-grow
                                  rows="2"
                                  max-rows="8"
                                  hide-details
                                  placeholder="Komentārs par klienta iespējām un laikiem...."
                                  class="mt-1"
                                  @update:modelValue="emitSaveComment"
                                />
              </template>
            <!-- <template #subtitle>
              <div :class="['comment-subtitle', { expanded: showFullComment }]">
                {{ r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem'] }}
              </div>
            </template> -->

          </v-list-item>

 <!-- label="Stundas" -->
 <!--    label="Minūtes" -->
          <v-list-item
            :title="r && r['Apsekošanas Laiks'] ? 'Ieplānotais apsekošanas Laiks' : 'Iespējamais apsekošanas Laiks'"
          >
            <template #subtitle>
              <div class="time-row">
                <v-select
                  v-model="hour"
                  :items="hours"
                 
                  density="compact"
                  hide-details
                  variant="outlined"
                  class="time-select"
                  @update:modelValue="emitIfComplete"
                />
                <span class="time-colon">:</span>
                <v-select
                  v-model="minute"
                  :items="minutes"
               
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

          <div class="field">
            <div class="field-title">Adrese</div>
            <button
              class="field-sub copyable"
              type="button"
              :aria-label="`Nokopēt adresi ${r.Adrese || ''}`"
              @click="copyValue(r.Adrese || '', 'Adrese')"
            >
              <span class="truncate-wrap">{{ r.Adrese || '' }}</span>
              <v-icon size="14" icon="mdi-content-copy" class="ml-1" />
            </button>
          </div>
          <v-snackbar v-model="copySnack" timeout="1600" location="top" color="success">
            {{ copySnackText }}
          </v-snackbar>
          <!-- <v-list-item title="Klienta adrese" :subtitle="r.Adrese || ''" /> -->
        </v-list>
      </v-card-text>

      <v-divider />
      <!-- <v-card-actions class="justify-end">

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
     </v-card-actions> -->
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
  emits: ['close', 'confirm', 'remove', 'cancelTime', 'setTime', 'saveComment'], 
  data() {
    return { 
      showFullComment: false,
      commentDraft: '',
      commentSaving: false,
      copySnack: false , 
      copySnackText: false, 
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

    r: {
      immediate: true,
      handler(val) {
        this.commentDraft = val?.['Pārdevēja Komentārs , par klienta iespējamajiem laikiem'] || '';
      }
    },
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
    async copyValue(text, label) {
      const value = String(text ?? '');
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        this.copySnackText = `${label} nokopēts`;
      } catch (e) {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        // try { document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta);
        this.copySnackText = `${label} nokopēts`;
      }
      this.copySnack = true;
    },


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
    }, 
    emitSaveComment(val) {
      this.commentDraft = val;
      this.$emit('saveComment', val);
      // this.commentSaving = true;
      // // emit up; parent will persist and can optionally resolve a promise
      // const maybePromise = this.$emit('saveComment', this.commentDraft);
      // // allow parent to be sync or async; stop the spinner either way
      // Promise.resolve(maybePromise).finally(() => (this.commentSaving = false));
    },


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

.card-header {
  /* keep it tidy and prevent wrap jitter */
  gap: 8px;
  padding-inline: 16px;
}

.header-title {
  font-weight: 600;
}


.header-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;      /* <-- never stack */
  white-space: nowrap; 
  /* flex-wrap: wrap;       allows wrapping on very narrow widths */
}


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

.copyable {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 2px 0;
  background: transparent;
  border: 0;
  color: inherit;
  width: 100%;
  text-align: left;
}
.copyable:focus-visible {
  outline: 2px solid var(--v-theme-primary);
  outline-offset: 2px;
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