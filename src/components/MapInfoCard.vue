<template>
    <v-card v-if="r" rounded="xl" elevation="6" max-width="380" class="info-card">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Vizītes dati</span>
      </v-card-title>
  
      <v-divider />
  
      <v-card-text class="pt-2">
        <v-list density="compact">
          <!-- <v-list-item title="Pieteikšanas Datums" :subtitle="r['Pieteikšanas Datums']" /> -->
          <v-list-item title="Klients" :subtitle="r['Klienta vārds, uzvārds'] || ''" />
          <v-list-item title="Pārdevējs" :subtitle="r['Pārdevējs īpašnieks'] || ''" />
          <v-list-item title="Tel.nr" :subtitle="r['Tel.nr'] || ''" />
          <v-list-item title="Produkta tips:" :subtitle="r['Komentārs, kas nepieciešams klientam'] || ''" />
          <v-list-item class="clamp" style="--clamp: 6"                v-if="r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem']" title="Komentārs:"
  :subtitle="r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem']">

            <template #subtitle>
              <div :class="['comment-subtitle', { expanded: showFullComment }]">
                {{ r['Pārdevēja Komentārs , par klienta iespējamajiem laikiem'] }}
              </div>
              <!-- <v-btn
                variant="text"
                size="x-small"
                class="mt-1 px-0"
                @click="showFullComment = !showFullComment"
              >
                {{ showFullComment ? 'Rādīt mazāk' : 'Rādīt vairāk' }}
              </v-btn> -->
            </template>

          </v-list-item>

          <v-list-item v-if="!r['Apsekošanas Laiks']" title="Iespējamais apsekošanas Laiks">
            <template #subtitle>
              <v-chip color="primary" size="small" label>{{ arrivalTime || '' }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item v-if="r && r['Apsekošanas Laiks']" title="Ieplānotais apsekošanas Laiks">
            <template #subtitle>
              <v-chip color="primary" size="small" label>{{ arrivalTime || '' }}</v-chip>
            </template>
          </v-list-item>
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
  emits: ['close', 'confirm', 'remove', 'cancelTime'], 
  data() {
    return { showFullComment: false};
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

/* (optional) allow wrapping in list items */
/* :deep(.v-list-item-title),
:deep(.v-list-item-subtitle) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  word-break: break-word;
} */


/* :deep(.v-list-item-title),
:deep(.v-list-item-subtitle) {
  white-space: normal;
  word-break: break-word;
} */

/* allow wrapping for all list-item text inside this component */
/* :deep(.v-list-item-title),
:deep(.v-list-item-subtitle) {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
  word-break: break-word;
} */

/* avoid hidden overflow on the content wrapper */
/* :deep(.v-list-item .v-list-item__content) {
  overflow: visible !important;
} */



</style>