const axios = require('axios');
let data = {
    "summary": "## **Investor Portfolio API**\n\n**Overview:**\nThis API retrieves the portfolio details of a specified investor. Each investor has a unique identifier (UUID), name, and type. This allows you to fetch the full portfolio of companies associated with the investor, using their UUID or name as an identifier.\n\nRequired: authentication token `auth_token` for user identification.\n\n### **Request:**\n- **Use Case:** Retrieve the portfolio details of a specified investor based on their UUID or name.\n- **Request Method:** GET request\n- **Request Parameters:**\n  - `investor_uuid`: The unique identifier for an investor.\n  - `investor_name`: The name of the investor.\n\n### **Request Example (By UUID):**\n```json\ncurl 'https://api.crustdata.com/data_lab/investor_portfolio?investor_uuid=ce91bad7-b6d8-e56e-0f45-4763c6c5ca29' \\\n  --header 'Accept: application/json, text/plain, */*' \\\n  --header 'Accept-Language: en-US,en;q=0.9' \\\n  --header 'Authorization: Token $auth_token'\n```\n\n### **Request Example (By Name):**\n```json\ncurl 'https://api.crustdata.com/data_lab/investor_portfolio?investor_name=Sequoia Capital' \\\n  --header 'Accept: application/json, text/plain, */*' \\\n  --header 'Accept-Language: en-US,en;q=0.9' \\\n  --header 'Authorization: Token $auth_token'\n```\n\n### **Response:**\n- **Returns:** The full portfolio of companies associated with the specified investor.\n\nExample Response:\n```json\n{\n  \"investor_name\": \"Sequoia Capital\",\n  \"portfolio\": [\n    {\n      \"company_name\": \"Company A\",\n      \"company_id\": 12345,\n      \"investment_stage\": \"Series A\"\n    },\n    {\n      \"company_name\": \"Company B\",\n      \"company_id\": 67890,\n      \"investment_stage\": \"Seed\"\n    }\n  ]\n}\n```"
  }    
           

let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://localhost:3000/api/embedding',
    headers: {
        'Content-Type': 'application/json'
    },
    data: data
};

axios.request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    });
