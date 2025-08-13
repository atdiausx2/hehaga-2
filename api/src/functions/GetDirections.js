const { app } = require('@azure/functions');
const axios = require('axios');
const https = require('https');

// Force IPv4 (helps on some networks) and keep-alive
const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });
const DIRECTIONS_KEY = 'AIzaSyB0FzB8FmTx40kxhsmf1n-1tlRlr27ldRg';

app.http('GetDirections', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
    try {

        const r_origin = request.query.get('r_origin');
        const r_destination = request.query.get('r_destination');

        if (!r_origin || !r_destination) {
            return { status: 400, jsonBody: { error: 'Missing r_origin or r_destination' } };
          }

        context.log(`Calling Google Directions for "${r_origin}" -> "${r_destination}"`);

        const resp = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: { origin: r_origin, destination: r_destination, key: DIRECTIONS_KEY, mode: 'driving' },
        timeout: 10000,                
        httpsAgent,                    
        validateStatus: () => true    
      });

        if (resp.status !== 200 || resp.data?.status !== 'OK' || !resp.data?.routes?.length) {
            return {
              status: 502,
              jsonBody: {
                error: resp.data?.error_message || resp.data?.status || `HTTP ${resp.status}`
              }
            };
          }
        

      const leg = resp.data.routes[0].legs?.[0];
      if (!leg?.duration?.value) {
        return { status: 502, jsonBody: { error: 'Unexpected response shape (no duration)' } };
      }
      const driveMin = Math.round((leg.duration.value / 60) * 10) / 10;
      console.log(` driving time obtained: ${driveMin}`)
      return { status: 200, jsonBody: { laiks: driveMin } };
    
    } 
      catch (err) { 

        context.error('GetDirections failed', { code: err.code, message: err.message });
        return { status: 500, jsonBody: { error: err.code || err.message || 'Internal error' } };

      }

}
});
