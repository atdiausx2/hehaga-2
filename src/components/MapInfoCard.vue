<template>
    <v-card v-if="r" rounded="xl" elevation="6" max-width="380">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Vizītes dati</span>
        <v-btn icon variant="text" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
  
      <v-divider />
  
      <v-card-text class="pt-2">
        <v-list density="compact">
          <!-- <v-list-item title="Pieteikšanas Datums" :subtitle="r['Pieteikšanas Datums']" /> -->
          <v-list-item title="Klients" :subtitle="r['Klienta vārds, uzvārds'] || ''" />
          <v-list-item title="Pārdevējs" :subtitle="r['Pārdevējs īpašnieks'] || ''" />
          <v-list-item title="Tel.nr" :subtitle="r['Tel.nr'] || ''" />
          <v-list-item title="Iespējamais apsekošanas Laiks">
            <template #subtitle>
              <v-chip color="primary" size="small" label>{{ arrivalTime || '' }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item title="Klienta adrese" :subtitle="r.Adrese || ''" />
        </v-list>
      </v-card-text>
  
      <v-card-actions class="justify-end">
        <v-btn color="primary" @click="$emit('confirm')">Apstiprināt</v-btn>
        <v-btn variant="tonal" color="primary" @click="$emit('remove')">Atmest</v-btn>
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
  emits: ['close', 'confirm', 'remove']
};


  // defineProps({ r: Object, arrivalTime: String });
  // defineEmits(['close', 'confirm', 'remove']);
  </script>
  