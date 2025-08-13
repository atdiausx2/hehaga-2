const { app } = require('@azure/functions');
const axios = require('axios');

app.http('GetToken', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
    context.log(`Http function processed request for url "${request.url}"`);
    const tenantId = `6adac36c-750f-40de-b6f6-b51b5b7801fd`;
    context.log(`now trying`);
    try { 
        const response = await axios.post(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            new URLSearchParams({
              client_id: "96be743e-8163-4849-808f-d73d06d1c1da",
              client_secret: "BGJ8Q~_wER1~XaeNnFvYaSBmdXySK7v4glGfKaDh",
              scope: "https://graph.microsoft.com/.default",
              grant_type: "client_credentials"
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
            // token_to_return = await response.json(); 
            // context.log(`this is the token returned ${token_to_return}`)
        
            token_final = response.data.access_token;
        
            context.log(`this is the token returned ${token_final}`)
        
            return { headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({token : token_final}) };

    } catch (err) {
        context.log.error('Token fetch failed:', err.message);
        return {
          status: 500,
          body: 'Failed to fetch token'
        };
      }
    }
});
