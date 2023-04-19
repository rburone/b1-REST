# b1-REST
Simple data-object creator.

Using JSON definitions from the endpoints, create a Javascript object to do the queries.

### Example of definitions of some Endpoints:
```json
{
    "name": "patch",
    "verb": "patch",
    "path": "/:model",
    "descrip": "Patch an existing model instance or insert a new one into the data source.",
    "return": "data"
},
{
    "name": "patchId",
    "verb": "patch",
    "path": "/:model/:id",
    "descrip": "Patch attributes for a model instance and persist it into the data source."
}
```
**name**: Name or identifier.

**verb**: HTTP request method.

**path**: Path REST. Use ":" for create args

**descrip**: Endpoint description.

**return**: 'data'. If it returns an array of a single element, it returns the element.

### Use:
```javascript
const b1HapiREST = new B1Rest({ URL: `/api`, httpService: axios, timeout: 15000, raw: false, debug: false });
```
**URL**: URL REST server

**httpService**: HTTP client

**timeout**: time to wait for a response

**raw**: if true return the raw request response

**debug**: use console for debug messages
```javascript
// Can use access_token
b1HapiREST.access_token = "my_access_token_data"

// Create data-object for model: REST.model(rest_model_name, list name Endpoints to use)
const Customer = b1HapiREST.model('customers', [
    'get',
    'patchId'
    /*, { custom... }*/
]);

const options = {filter:{'where':'Ricardo'}} // {filter: '...', query: '...'}

Customer.get(/* options */)
    .then(response => {
        // ...
    })
    .catch(error => {
        // ...
    })
// 	[GET] http://localhost/api/customer?filter={"where":{"name":"Ricardo"}}&access_token=my_access_token_data

const body = {} // Data for BODY used in POST, PATCH request methods
Customer.patchId({id: 'C135', data: body}).then(/*...*/)
// 	[PATCH] http://localhost/api/customer/C135?access_token=my_access_token_data
```