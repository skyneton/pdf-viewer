const PDF_READER_MAIN_URL = URL.createObjectURL(new Blob([`(${pdfjsLibWorker.toString()})()`]))
    , PDF_WORKER_MAIN_URL = URL.createObjectURL(new Blob([`(${pdfWorkerJs.toString()})()`]));

function PDFReader(options) {
    "use strict";
    const WORKER = [];
    let WORKER_URL, numPages = 0;
    const idx = [];
    let targetWorker = 0;
    let numImageConverts = 0;
    let pdfLoadedTime = 0;
    let targetWorkerUid;

    const throwError = (err, options, id, isThrow = true) => {
        if(id != undefined && id != null) delete idx[id];

        if(options.error) options.error.call(this, err);
        else if(isThrow) throw err;
        else console.error(err.message);
    };

    const randomKey = () => {
        return `${((1 + Math.random()) * 0x10000 | 0).toString(32)}`
         + `-${((1 + Math.random()) * 0x10000 | 0).toString(32)}`
         + `-${((1 + Math.random()) * 0x10000 | 0).toString(32)}`
         + `-${((1 + Math.random()) * 0x1000000 | 0).toString(32)}`;
    }

    const workerInit = () => {
        if(OffscreenCanvas && Worker && location.protocol.startsWith("http")) {
            WORKER_URL = URL.createObjectURL(new Blob([`(${threadWorker.toString()})()`]));

            let workerLength = options.numWorkers;
            if(!workerLength || workerLength <= 0) workerLength = 1;

            const id = randomKey();
            idx[id] = options;

            for(let i = 0; i < workerLength; i++) {
                const tempWorker = new Worker(WORKER_URL);
                tempWorker.addEventListener("message", getThreadMessage(i));

                tempWorker.postMessage({
                    type: "init",
                    data: options.file,
                    url: [PDF_READER_MAIN_URL, PDF_WORKER_MAIN_URL],
                    return: id,
                });

                WORKER.push({worker: tempWorker});
            }

            targetWorkerUpdate();
        }else {
            throw new Error("Can't Use");
        }
    };

    const targetWorkerUpdate = () => {
        if(++targetWorker >= Object.keys(WORKER).length) targetWorker = 0;
        targetWorkerUid = Object.keys(WORKER)[targetWorker];
    };

    var getThreadMessage = id => e => {
        const packet = e.data, options = idx[packet.return];
        if(options) {
            if(packet.isPageNum) {
                if(packet.type == "error") {
                    console.error(packet.result);
                    WORKER[id].worker.terminate();
                    delete WORKER[id];
                    if(Object.keys(WORKER).length <= 0) {
                        throwError(new Error(packet.result), options, packet.return, false);
                        Reader.close();
                    }
                    return;
                }
                numPages = packet.result;
                WORKER[id].initalized = true;
                let isAllInitalized = true;

                for(let i = 0; i < WORKER.length; i++) {
                    if(!WORKER[i].initalized) {
                        isAllInitalized = false;
                        break;
                    }
                }

                if(isAllInitalized) {
                    pdfLoadedTime = Date.now();
                    if(options.success) options.success.call(this, packet.result);
                    delete idx[packet.return];
                }
                return;
            }
            numImageConverts++;
            if(packet.type == "error") return throwError(new Error(packet.result), options, packet.return);
            delete idx[packet.return];
            if(options.success) options.success.call(this, packet.result);
        }
    };


    var threadWorker = () => {
        const fileReaderAsync = file => {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(new Uint8Array(reader.result));
                }

                reader.readAsArrayBuffer(file);
            });
        };

        const base64ToArray = base64 => {
            if(base64.includes(",")) base64 = base64.split(",")[1];
            const raw = atob(base64);
            const rawLength = raw.length;
            const array = new Uint8Array(new ArrayBuffer(rawLength));

            for(let i = 0; i < rawLength; i++) array[i] = raw.charCodeAt(i);

            return array;
        };

        const initalizer = async packet => {
            for(let i = 0; i < packet.url.length; i++) {
                importScripts(packet.url[i]);
            }

            try {
                if(packet.data instanceof File) {
                    self.doc = await pdfjsLib.getDocument(await fileReaderAsync(packet.data)).promise;
                }
                else if(packet.data instanceof Uint8Array) {
                    self.doc = await pdfjsLib.getDocument(packet.data).promise;
                }
                else if(packet.data instanceof Blob) {
                    self.doc = await pdfjsLib.getDocument(new Uint8Array(await packet.data.ArrayBuffer()));
                }
                else if(typeof packet.data === "string") {
                    if(packet.data.startsWith("data:")) self.doc = await pdfjsLib.getDocument(base64ToArray(packet.data)).promise;
                    else self.doc = await pdfjsLib.getDocument(packet.data).promise;
                }
                self.postMessage({
                    "type": "success",
                    "isPageNum": true,
                    "result": self.doc.numPages,
                    "return": packet.return,
                });
            }catch(e) {
                self.postMessage({
                    "type": "error",
                    "isPageNum": true,
                    "result": e.message,
                    "return": packet.return,
                });
            }
        };

        const getPageImage = async packet => {
            try {
                let scale = packet.scale;
                if(!scale) scale = 96.0 / 72.0;

                const page = await self.doc.getPage(packet.data);
                const viewport = page.getViewport({scale});

                const canvas = new OffscreenCanvas(viewport.width, viewport.height);

                await page.render({canvasContext: canvas.getContext("2d", { alpha: false }), viewport}).promise;

                const result = {
                    "type": "success",
                    "result": await canvas.convertToBlob({ type: "image/jpeg" }),
                    "return": packet.return,
                };

                if(packet.toURL) {
                    result.result = URL.createObjectURL(result.result);
                }

                self.postMessage(result);
            }catch(e) {
                self.postMessage({
                    "type": "error",
                    "result": e.message,
                    "return": packet.return,
                });
            }
        };

        const getImageBitMap = async packet => {
            try {
                let scale = packet.scale;
                if(!scale) scale = 96.0 / 72.0;

                const page = await self.doc.getPage(packet.data);
                const viewport = page.getViewport({scale});

                const canvas = new OffscreenCanvas(viewport.width, viewport.height);
                const ctx = canvas.getContext("2d", { alpha: false });
                await page.render({canvasContext: ctx, viewport}).promise;

                let bitmap;
                try {
                    bitmap = canvas.transferToImageBitmap();
                }catch {
                    bitmap = createImageBitmap(ctx.createImageData(canvas.width, canvas.height));
                }

                self.postMessage({
                    "type": "success",
                    "result": {
                        bitmap,
                        transform: {
                            x: viewport.width,
                            y: viewport.height,
                        },
                    },
                    "return": packet.return,
                }, [bitmap]);
            }catch(e) {
                self.postMessage({
                    "type": "error",
                    "result": e.message,
                    "return": packet.return,
                });
            }
        };

        const drawPageCanvas = async (packet) => {
            try {
                if(!packet.scale) packet.scale = 96.0 / 72.0;

                const page = await self.doc.getPage(packet.page);
                const viewport = page.getViewport({"scale": packet.scale});

                packet.data.width = viewport.width;
                packet.data.height = viewport.height;

                const ctx = packet.data.getContext("2d", { alpha: false });
                ctx.fillStyle = "aqua"
                ctx.fillRect(0, 0, 1000, 1000);
                // await page.render({canvasContext: ctx, viewport}).promise;

                self.postMessage({
                    "type": "success",
                    "result": {
                        x: viewport.width,
                        y: viewport.height,
                    },
                    "return": packet.return,
                });
            }catch(e) {
                self.postMessage({
                    "type": "error",
                    "result": e.message,
                    "return": packet.return,
                });
            }
        }

        self.addEventListener("message", e => {
            const packet = e.data;
            switch(packet.type) {
                case "init": {
                    initalizer(packet);
                    break;
                }
                case "getPageImage": {
                    if(!self.doc) self.postMessage({
                        "type": "error",
                        "result": "PDF Document can't load",
                        "return": packet.return,
                    });
                    else getPageImage(packet);
                    break;
                }
                case "getImageBitMap": {
                    if(!self.doc) self.postMessage({
                        "type": "error",
                        "result": "PDF Document can't load",
                        "return": packet.return,
                    });
                    else getImageBitMap(packet);
                    break;
                }
                case "drawPageCanvas": {
                    drawPageCanvas(packet);
                    break;
                }
            }
        });
    };


    var Reader =  new class {
        constructor() {
            if(typeof options === "undefined") {
                throw new Error("Please input options data");
            }

            if(!options.file) return throwError(new Error("Please input file"), options);
            const file = options.file;

            if(!(file instanceof File || file instanceof Blob || file instanceof Uint8Array || typeof file === "string")) {
                throw new Error("file type must File or Blob or Uint8Array or string");
            }

            workerInit();
        }

        getPageImage(options) {
            if(WORKER.length <= 0) throw new Error("Can't use");
            if(!options.page) return throwError(new Error("Please input page"), options);

            const id = (() => {
                let temp = randomKey();
                while(idx[temp]) temp = randomKey();
                return temp;
            })();
            idx[id] = options;
            
            if(typeof options === "undefined") {
                throw new Error("Please input options data");
            }

            WORKER[targetWorkerUid].worker.postMessage({
                "type": "getPageImage",
                "data": options.page,
                "scale": options.scale,
                "toURL": options.toURL,
                "return": id,
            });

            targetWorkerUpdate();
        }

        getImageBitMap(options) {
            if(typeof options === "undefined") {
                throw new Error("Please input options data");
            }

            if(WORKER.length <= 0) return throwError(new Error("Can't use"), options);
            if(!options.page) return throwError(new Error("Please input page"), options);

            const id = (() => {
                let temp = randomKey();
                while(idx[temp]) temp = randomKey();
                return temp;
            })();
            idx[id] = options;

            WORKER[targetWorkerUid].worker.postMessage({
                "type": "getImageBitMap",
                "data": options.page,
                "scale": options.scale,
                "return": id,
            });

            targetWorkerUpdate();
        }

        drawPageCanvas(options) {
            if(typeof options === "undefined") {
                throw new Error("Please input options data");
            }

            if(!options.page) return throwError(new Error("Please input page"), options);
            if(!options.canvas) return throwError(new Error("Please input canvas"), options);
            if(options.canvas instanceof HTMLCanvasElement) {
                if(options.canvas.transferControlToOffscreen) options.canvas = options.canvas.transferControlToOffscreen();
                else return throwError(new Error("Not support transferControlToOffscreen"), options);
            }else if(!(options.canvas instanceof OffscreenCanvas)) return throwError(new Error("Canvas should offScreenCanvas or canvas"), options);

            const id = (() => {
                let temp = randomKey();
                while(idx[temp]) temp = randomKey();
                return temp;
            })();
            idx[id] = options;

            if(WORKER.length <= 0) return throwError(new Error("Can't use"), options);

            WORKER[targetWorkerUid].worker.postMessage({
                "type": "drawPageCanvas",
                "data": options.canvas,
                "page": options.page,
                "scale": options.scale,
                "return": id,
            }, [options.canvas]);

            targetWorkerUpdate();
        }

        get numPages() {
            return numPages;
        }

        get numWorkers() {
            return WORKER.length;
        }

        get numImageConverts() {
            return numImageConverts;
        }

        get pdfLoadedTime() {
            return pdfLoadedTime;
        }

        get isActive() {
            return WORKER.length > 0;
        }

        close() {
            for(const key in WORKER) WORKER[key].worker.terminate();
            if(!!WORKER_URL) URL.revokeObjectURL(WORKER_URL);

            for(const key in idx) {
                throwError(new Error("PDFReader closed"), idx[key], false);
            }
        };
    };

    return Reader;
}