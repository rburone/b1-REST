/* eslint-disable */
class b1REST {
    constructor({URL, httpService, timeout = 5000, debug = false}) {
        this.URL = URL
        this.httpService = httpService
        this.access_token = false
        this.defaultHeader = {headers: {'Content-Type': 'application/json'}}
        this.customEndPoints = []
        this.debug = debug
        this.timeout = timeout
    }

    errorManager({error}, verb) {
        let out = {}
        if (this.debug) {
            console.debug('DEBUG REST: ', 'ERROR: ', error.statusCode, verb)
        }

        switch (error.code || error.statusCode) {
            case 11000:
                out = {code: 'ERR_DUP_KEY', name: error.name, message: error.message, statusCode: error.statusCode}
                break;
            case 422:
                out = {name: error.error.name, message: error.error.message, statusCode: error.error.statusCode, details: error.error.details}
                break;
            case 'ENOENT':
                out = ('Error al configurar el almacen de archivos.')
                break
            case 'ERR_INVALID_ARG_TYPE':
                out = ('Error INTERNO! No se puede continuar.')
                break
            case 'ERR_MISSING_ARG':
                out = ('Error INTERNO! No se puede continuar.')
                break
            case 'ERR_VALIDATION':
                out = (`Error VALIDACION! en ${error.context}`)
                break
            case 'MODEL_NOT_FOUND':
                out = {code: error.code, name: error.name, message: error.message, statusCode: error.statusCode}
                break
            case 'LOGIN_FAILED_EMAIL_NOT_VERIFIED':
                out = {code: error.error.code, name: error.error.name, message: error.error.message, statusCode: error.error.statusCode}
                break
            case 'USERNAME_EMAIL_REQUIRED':
                out = {code: error.code, name: error.name, message: error.message, statusCode: error.statusCode}
                break
            default:
                out = error
                break
        }
        return out
    }

    static defaultEndPoint(name) {
        return [
            {"name": "patch", "verb": "patch", "path": "/:model", "descrip": "Patch an existing model instance or insert a new one into the data source."},
            {"name": "get", "verb": "get", "path": "/:model", "descrip": "Find all instances of the model matched by filter from the data source."},
            {"name": "put", "verb": "put", "path": "/:model", "descrip": "Replace an existing model instance or insert a new one into the data source."},
            {"name": "create", "verb": "post", "path": "/:model", "descrip": "Create a new instance of the model and persist it into the data source."},
            {"name": "patchId", "verb": "patch", "path": "/:model/:id", "descrip": "Patch attributes for a model instance and persist it into the data source."},
            {"name": "getId", "verb": "get", "path": "/:model/:id", "descrip": "Find a model instance by {{id}} from the data source.", "return": "data"},
            {"name": "head", "verb": "head", "path": "/:model/:id", "descrip": "Check whether a model instance exists in the data source."},
            {"name": "putId", "verb": "put", "path": "/:model/:id", "descrip": "Replace attributes for a model instance and persist it into the data source."},
            {"name": "delete", "verb": "delete", "path": "/:model/:id", "descrip": "Delete a model instance by {{id}} from the data source."},
            {"name": "exists", "verb": "get", "path": "/:model/:id/exists", "descrip": "Check whether a model instance exists in the data source.", "return": "data"},
            {"name": "replaceId", "verb": "post", "path": "/:model/:id/replace", "descrip": "Replace attributes for a model instance and persist it into the data source."},
            {"name": "getChangeStream", "verb": "get", "path": "/:model/change-stream", "descrip": "Create a change stream."},
            {"name": "postChangeStream", "verb": "post", "path": "/:model/change-stream", "descrip": "Create a change stream."},
            {"name": "count", "verb": "get", "path": "/:model/count", "descrip": "Count instances of the model matched by where from the data source.", "return": "data"},
            {"name": "findOne", "verb": "get", "path": "/:model/findOne", "descrip": "Find first instance of the model matched by filter from the data source.", "return": "data"},
            {"name": "replaceOrCreate", "verb": "post", "path": "/:model/replaceOrCreate", "descrip": "Replace an existing model instance or insert a new one into the data source."},
            {"name": "update", "verb": "post", "path": "/:model/update", "descrip": "Update instances of the model matched by {{where}} from the data source."},
            {"name": "upsert", "verb": "post", "path": "/:model/upsertWithWhere", "descrip": "Update an existing model instance or insert a new one into the data source based on the where criteria."}
        ].filter(item => item.name == name)
    }

    set token(token) {
        this.access_token = token
    }

    get token() {
        return this.access_token
    }

    model(modelName, endPointList = []) {
        if (!this[modelName]) {
            this[modelName] = {name: modelName}
            endPointList.forEach(endPoint => {
                this.createEndPointCtrl(this[modelName], endPoint)
            })
            this[modelName].URL = (endPoint, options = false) => {
                const path = (this[modelName][`URL_${endPoint}`])
                return this.auth(this.parse(path, options))
            }
        }
        return this[modelName]
    }

    parse(path, options = false) { // options: {filter: '...', query: '...'}
        let sep = '?'
        path = path.replace(':model', this.model)
        const args = path.match(/:[^/]+/g)

        if (args && options) {
            let totArgs = args.length

            if (typeof options == 'object') {
                args.forEach(element => {
                    const value = options[element.slice(1)]
                    if (value) {
                        path = path.replace(element, value)
                        totArgs--
                    }
                })
            }

            if (totArgs != 0) {
                const error = {
                    status: 'ERR_MISSING_ARG',
                    name: 'internalError',
                    context: path
                }
                console.error(error)
                throw error
            }
        }

        if (options) {
            if (options.filter) {
                if (typeof options.filter == 'object') {
                    path = `${path}?filter=${JSON.stringify(options.filter)}`
                } else {
                    path = `${path}?filter${options.filter}`
                }
                sep = '&'
            }

            if (options.query) {
                path = `${path}${sep}${this.obj2query(options.query)}`
                sep = '&'
            }
        }

        return this.URL + path
    }

    setEndpoint(definition = false) {
        if (definition) {
            const typeArg = typeof definition
            if (Array.isArray(definition)) {
                definition.forEach(def => {
                    this.customEndPoints.push(def)
                })
            } else if (typeArg == 'object') {
                this.customEndPoints.push(definition)
            }
        }
    }

    createEndPointCtrl(model, endPointDef = false) {
        let endPointConfig = false,
            endPoint = false,
            exists = false

        if (endPointDef) {
            switch (typeof endPointDef) {
                case 'string':
                    if (!exists) {
                        const auxSearch = this.customEndPoints.find(
                            item => item.name == endPointDef
                        )

                        endPointConfig =
                            auxSearch ||
                            b1REST.defaultEndPoint(endPointDef)[0] ||
                            false

                        endPoint = endPointDef
                    } else {
                        console.log('Ya existe')
                    }
                    break
                case 'object':
                    if (!this[endPointDef.name]) {
                        endPointConfig = endPointDef // HACER: Validación de definicion.
                        endPoint = endPointDef.name
                    } else {
                        console.log('Ya existe')
                        exists = true
                    }
                    break
                default:
                    throw {mensaje: 'Definición de endpoint erronea.'}
            }

            if (!exists && endPointConfig.path) {
                let path = endPointConfig.path
                const header = (endPointConfig.header) ? endPointConfig.header : this.defaultHeader

                path = path.replace(':model', model.name)
                // ------- DEFINICION METHODOS DE LA INSTANCIA
                model[`URL_${endPoint}`] = path
                model[endPoint] = options => {
                    const URL = this.parse(path, options)

                    if (this.debug)
                        console.debug('DEBUG REST: ', `${endPoint} [${endPointConfig.verb}] ${!!this.access_token ? '' : 'no token'}`, this.auth(URL))

                    let data = false

                    if (options && options.data) {
                        data = this.sanitize(options.data)
                    }

                    //    ██▀   █ ██▀ ▄▀▀ █ █ ▀█▀ ▄▀▄    ▄▀▀ ▄▀▄ █▄ █ ▄▀▀ █ █ █   ▀█▀ ▄▀▄
                    //    █▄▄ ▀▄█ █▄▄ ▀▄▄ ▀▄█  █  █▀█    ▀▄▄ ▀▄▀ █ ▀█ ▄█▀ ▀▄█ █▄▄  █  █▀█

                    return new Promise((resolve, reject) => {
                        setTimeout(() => reject('NO_RESPONSE'), this.timeout)
                        this.httpService[endPointConfig.verb](this.auth(URL), data, header).then(result => {
                            if (result.data.error) {
                                reject(this.errorManager(result.data.error, endPointConfig.verb))
                            } else {
                                resolve(Array.isArray(result.data) &&
                                    endPointConfig.return == 'data'
                                    ? result.data[0]
                                    : result.data
                                )
                            }
                        }).catch(error => {
                            reject(this.errorManager(error.response.data, endPointConfig.verb))
                        })
                    })
                }
            } else {
                console.error(
                    `Falta PATH del endpoint ${endPointConfig} de ${model.name} -> ${endPointDef}`
                )
            }
            // ------- FIN DEFINICION
        }
    }

    auth(endPoint) {
        if (this.access_token) {
            const sep = /\?/.test(endPoint) ? '&' : '?'
            return `${endPoint}${sep}access_token=${this.access_token}`
        } else {
            return endPoint
        }
    }

    sanitize(obj) {
        if (obj) {
            let out = obj
            if (typeof obj == 'object') {
                // this.mutileMethods(obj)
                out = JSON.stringify(obj).replace(
                    /,?'\$\$hashKey':'[^']+'/g,
                    ''
                )
            } else {
                out = obj
            }
            return out
        }
    }

    mutileMethods(obj) {
        for (const prop in obj) {
            if (typeof obj[prop] == 'function') {
                delete obj[prop]
            }
        }
    }

    obj2query(obj) {
        const keys = Object.keys(obj)
        let query = '',
            sep = ''
        keys.forEach(item => {
            query += sep + item + '=' + obj[item]
            sep = '&'
        })
        return query
    }
}

module.exports = b1REST
