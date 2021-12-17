class b1STORAGE_REST {
    constructor({URL, httpService, timeout = 5000, debug = false}) {
        this.URL = URL
        this.httpService = httpService
        this.access_token = false
        this.defaultHeader = {headers: {'Content-Type': 'application/json'}}
        this.customEndPoints = []
        this.debug = debug
        this.timeout = timeout

        this.defaultEndPoint = [
            // {"name": "create", "verb": "post", "path": "/", "descrip": "Create a new container"},
            {"name": "list", "verb": "get", "path": "/list", "descrip": "List all stores."},
            // { "name": "delContainer", "verb": "delete", "path": "/:name", "descrip": "Delete a container." },
            // { "name": "info", "verb": "get", "path": "/:name", "descrip": "Get info of a container.", "return": "data" },
            {"name": "download", "verb": "get", "path": "/:name/download/:file", "descrip": "Download a file from a container [?s=<subdir>,<zip>]."},
            {"name": "base64", "verb": "get", "path": "/:name/base64/:file", "descrip": "Download a file from a container as base64"},
            {"name": "files", "verb": "get", "path": "/:name/files", "descrip": "Get list of files of container [?s=<subdir>]."},
            {"name": "file", "verb": "get", "path": "/:name/files/:file", "descrip": "Get info of a file of container."},
            {"name": "delFile", "verb": "delete", "path": "/:name/file/:file", "descrip": "Remove a file of store."},
            {"name": "delDir", "verb": "delete", "path": "/:name/dir/:subdir", "descrip": "Remove a subdirectory of store."},
            {"name": "upload", "verb": "post", "path": "/:name/", "descrip": "Upload file to store."},
            {"name": "zip", "verb": "get", "path": "/:name/zip", "descrip": "Download as zip file a store [?s=<subdir>].", "header": "responseType: 'arraybuffer'"}
        ]
    }

    set token(token) {
        this.access_token = token
    }

    get token() {
        return this.access_token
    }

    addContainer(containerName) {
        if (!this[containerName]) {
            this[containerName] = {name: containerName}
            this.defaultEndPoint.forEach(endPoint => {
                this.createEndPointCtrl(this[containerName], endPoint)
            })
            this[containerName].create = async () => {
                try {
                    const result = await this.httpService.post(this.auth(this.URL), {"name": containerName}, this.defaultHeader)
                    return result.data
                } catch (result) {
                    if (result.response.status == 404) {
                        throw this.$t('No existe storage!')
                    } else {
                        // ENOENT -> error en el storage
                        // EEXIST -> ya existe
                        const errorData = result.response.data.error
                        const error = {
                            status: errorData.statusCode,
                            name: errorData.name,
                            code: errorData.code,
                            context: 'storage'
                        }
                        throw error
                    }
                }
            }
            this[containerName].url = `${this.URL}/${containerName}`
        } else {
            console.info(`Container: ${containerName} ya creado.`)
        }
        return this[containerName]
    }

    parse(path, options = false) {
        let sep = '?'
        path = path.replace(':name', this.container)
        const args = path.match(/:[^/]+/g)

        if (args && options) {
            let totArgs = args.length;

            if (typeof options == 'object') {
                args.forEach(element => {
                    const value = options[element.slice(1)]
                    if (value) {
                        path = path.replace(element, value)
                        totArgs--
                    }
                });
            }

            if (totArgs != 0) {
                console.error(`Falta argumento requerido. ${path}`)
                throw {"mensaje": "Falta argumento requerido."}
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

    createEndPointCtrl(container, endPointDef) {
        let endPointConfig = false, endPoint = false, exists = false

        if (endPointDef && typeof endPointDef == 'object') {
            if (!this[endPointDef.name]) {
                endPointConfig = endPointDef// HACER: Validación de definicion.
                endPoint = endPointDef.name
            } else {
                console.log('Ya existe')
                exists = true
            }

            if (!exists && endPointConfig.path) {
                let path = endPointConfig.path
                const header = (endPointConfig.header) ? endPointConfig.header : this.defaultHeader
                path = path.replace(':name', container.name)
                //------- DEFINICION METHODOS DE LA INSTANCIA
                container[endPoint] = async (options) => {
                    // console.log(options)
                    const URL = this.parse(path, options)
                    if (this.debug) console.debug('DEBUG REST: ', `${endPoint} [${endPointConfig.verb}]`, URL)
                    let response, data

                    if (options && options.data) {
                        data = this.sanitize(options.data)
                    }

                    try {
                        if (data)
                            response = await this.httpService[endPointConfig.verb](this.auth(URL), data, header)
                        else {
                            const result = await this.httpService[endPointConfig.verb](this.auth(URL), header)
                            if (endPointConfig.header) {
                                response = result
                            } else
                                response = (Array.isArray(result.data) && endPointConfig.return == 'data') ? result.data[0] : result.data
                        }

                    } catch (result) {
                        if (result.response.data.error.name)
                            response = {"errorCode": result.response.data.error.name}
                        else
                            response = {"errorCode": result.response.data.error.code}
                    }
                    // return response.data;
                    return response
                }
            } else {
                console.error(`Falta PATH del endpoint ${endPointConfig} de ${container.name} -> ${endPointDef}`)
            }
            //------- FIN DEFINICION
        }
    }

    auth(endPoint) {
        if (this.access_token) {
            const sep = (/\?/.test(endPoint)) ? '&' : '?'
            return `${endPoint}${sep}access_token=${this.access_token}`
        } else {
            return endPoint
        }
    }

    sanitize(obj) {
        if (obj) {
            let out = obj;
            if (typeof obj == "object") {
                //this.mutileMethods(obj);
                out = JSON.stringify(obj).replace(/,?"\$\$hashKey":"[^"]+"/g, '')
            } else {
                out = obj
            }
            return out
        }
    }

    mutileMethods(obj) {
        for (let prop in obj) {
            if (typeof obj[prop] == 'function') {
                delete obj[prop]
            }
        }
    }

    obj2query(obj) {
        let query = '', sep = ''
        Object.keys(obj).forEach(item => {
            query += sep + item + '=' + obj[item]
            sep = '&'
        });
        return query
    }
}

// export default b1STORAGE_REST

// if (typeof window.module === 'object' && window.module) {
module.exports = b1STORAGE_REST
// }
