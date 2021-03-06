const PageViewer = () => {
    let direction = 0;
    let timeout;
    let doc;
    let nowPage = 1;
    const DELAY = 705;
    let showTimeout;
    let loadingPage;
    let beforeViewportPageLeft = 0;
    let dragPageMove = true;

    let beforeKeyPressTime = Date.now();

    let reader;

    const pointerData = {
        x: 0,
        y: 0,
        startClickTime: Date.now(),

        beforeScrolledTime: Date.now(),
        beforeClickedTime: Date.now(),
    };

    const prevWorker = {
        prevLoadingComplete: [],
        prevLoading: [],
        loadingAmount: 0,
    };

    const offset = {
        x: 0,
        y: 0,
    }

    const touchMoveData = {
        maxZoomScale: 5,
        nowZoomScale: 1,
        beforeDistance: -1,
        beforeX: -1,
        beforeY: -1,
    };
        
    var loadCanvas = (canvas, i) => {
        prevWorker.loadingAmount++;
        
        if(reader != null) {
            const success = () => {
                canvas.removeAttribute("loading");
                prevWorker.loadingAmount--;
                prevWorker.prevLoadingComplete[i - 1] = prevWorker.prevLoading[i - 1];
                delete prevWorker.prevLoading[i - 1];
                if(Object.keys(prevWorker.prevLoading).length <= 0) prevWorker.prevLoading = [];
            };

            const post = {
                success,
                canvas,
                page: i,
                scale: 96.0 / 72.0 * 2,
                maxPixels: 268435456,
            };
            if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                post.maxPixels = 3145728;
            }

            reader.drawPageCanvas(post);

            prevWorker.prevLoading[i - 1] = canvas;
            return;
        }

        doc.getPage(i).then(async page => {
            const viewport = page.getViewport({scale: 96.0 / 72.0});

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext("2d", { alpha: false });

            await page.render({
                canvasContext: ctx,
                viewport,
            }).promise;

            canvas.removeAttribute("loading");
            prevWorker.loadingAmount--;
            prevWorker.prevLoadingComplete[i - 1] = prevWorker.prevLoading[i - 1];
            delete prevWorker.prevLoading[i - 1];
            if(Object.keys(prevWorker.prevLoading).length <= 0) prevWorker.prevLoading = [];
        });

        prevWorker.prevLoading[i - 1] = canvas;
    };

    const getPDFPageCanvas = i => {
        if(prevWorker.prevLoadingComplete[i - 1]) return prevWorker.prevLoadingComplete[i - 1];
        if(prevWorker.prevLoading[i - 1]) return prevWorker.prevLoading[i - 1];

        const canvas = document.createElement("canvas");
        canvas.setAttribute("loading", true);

        loadCanvas(canvas, i);

        return canvas;
    };

    const cleanPageViewers = () => {
        const pageViewers = [...document.getElementsByClassName("pageViewer")];
        for(let i = 0; i < pageViewers.length; i++) {
            const imageList = pageViewers[i].getElementsByTagName("img");
            const canvasList = pageViewers[i].getElementsByTagName("canvas");
            if(pageViewers[i].offsetWidth === 0 || imageList.length <= 0 && canvasList.length <= 0 || !pageViewers[i].hasAttribute("hide") && pageViewers[i].hasAttribute("pageInfo") && pageViewers[i].getAttribute("pageInfo") != nowPage) {
                for(let i = 0, len = imageList.length; i < len; i++) imageList[i].cancel = true;
                for(let i = 0, len = canvasList.length; i < len; i++) canvasList[i].cancel = true;
                pageViewers[i].remove();
            }
        }
    };

    const cleanAndPrevLoad = page => {
        const prevLoadingKeys = Object.keys(prevWorker.prevLoading);
        const prevLoadingCompleteKeys = Object.keys(prevWorker.prevLoadingComplete);

        for(let i = 0, len = prevLoadingKeys.length; i < len; i++) {
            const key = prevLoadingKeys[i];
            if(Math.abs(key - page) > 5) delete prevWorker.prevLoading[key];
        }
        if(Object.keys(prevWorker.prevLoading).length <= 0) prevWorker.prevLoading = [];

        for(let i = 0, len = prevLoadingCompleteKeys.length; i < len; i++) {
            const key = prevLoadingCompleteKeys[i];
            if(Math.abs(key - page) > 5) delete prevWorker.prevLoadingComplete[key];
        }
        if(Object.keys(prevWorker.prevLoadingComplete).length <= 0) prevWorker.prevLoadingComplete = [];

        if(prevWorker.loadingAmount <= 1) {
            if(direction <= 0) {
                if(page - 1 >= 1) getPDFPageCanvas(page - 1);
                if(page - 2 >= 1) getPDFPageCanvas(page - 2);
            }
            if(direction >= 0) {
                if(page + 1 <= viewer.numPages) getPDFPageCanvas(page + 1);
                if(page + 2 <= viewer.numPages) getPDFPageCanvas(page + 2);
            }
        }
    };

    const setPageInfo = (page = nowPage) => {
        document.getElementsByClassName("currentPage")[0].value = page;
        sizeFitValue();

        const percent = (viewer.numPages - 1) <= 0 ? 1 : clamp((page - 1) / (viewer.numPages - 1), 0, 1);
        document.getElementsByClassName("scrollBarItem")[0].style.width = `${percent * 100}%`;
    };

    const getPDFPageView = i => {
        const imageBox = document.createElement("div");
        imageBox.setAttribute("class", "pageViewer");
        imageBox.setAttribute("pageInfo", i);

        const imageCanvas = document.createElement("div");
        imageCanvas.setAttribute("class", "imageCanvas");

        imageCanvas.appendChild(getPDFPageCanvas(i));
        imageBox.appendChild(imageCanvas);
        return imageBox;
    };

    const setHideViewer = (viewer, value, width, height) => {
        const imageCanvas = viewer.getElementsByClassName("imageCanvas")[0]
        if(value) {
            if(width == null) width = `${imageCanvas.offsetWidth}px`;
            if(height == null) height = `${imageCanvas.offsetHeight}px`;
            imageCanvas.style.width = width;
            imageCanvas.style.height = height;
            viewer.setAttribute("hide", true);
        }else {
            viewer.removeAttribute("hide");
            if(imageCanvas) {
                imageCanvas.style.width = null;
                imageCanvas.style.height = null;
            }
        }
    }

    const clamp = (v, min, max) => {
        if(min > max) {
            const temp = min;
            min = max;
            max = temp;
        }

        if(v < min) v = min;
        if(v > max) v = max;
        return v;
    }

    const scrollChange = clientX => {
        const percent = clamp((clientX - 8) / document.getElementsByClassName("scrollBar")[0].offsetWidth, 0, 1);
        setPageInfo(Math.round((viewer.numPages - 1) * percent) + 1);
    }

    const endScrollMove = () => {
        const scrollBar = document.getElementsByClassName("scrollBar")[0];
        const percent = clamp(scrollBar.getElementsByClassName("scrollBarItem")[0].offsetWidth / scrollBar.offsetWidth, 0, 1);
        scrollBar.touched = false;

        const page = Math.round(viewer.numPages * percent);
        setPageInfo(page);
        viewer.setPage(page);
        viewer.showMenu();
    }
    
    const fileReaderAsync = file => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(new Uint8Array(reader.result));
            }

            reader.readAsArrayBuffer(file);
        });
    };

    const getDocument = async files => {
        for(let i = 0; i < files.length; i++) {
            if(files[i].type === "application/pdf") {
                nowPage = -1;
                prevWorker.prevLoading = [];
                prevWorker.prevLoadingComplete = [];
                prevWorker.loadingAmount = 0;
                if(reader != null) reader.close();

                document.title = `PDF Viewer - ${files[i].name}`;

                try {
                    if(HTMLCanvasElement.prototype.transferControlToOffscreen) {
                        reader = new PDFReader({
                            numWorkers: 5,
                            file: files[i],
                            success(pages) {
                                document.getElementsByClassName("canvas")[0].style.display = null;
                                document.getElementsByClassName("fileOpenBox")[0].style.display = "none";
                                viewer.setPage(1);

                                document.getElementsByClassName("numPages")[0].innerText = pages;
                            },error(e) {
                                console.error(e);
                                reader = undefined;
                            }
                        });
                    }
                }catch(e) {
                    console.error(e);
                }finally {
                    if(!reader) {
                        doc = await pdfjsLib.getDocument(await fileReaderAsync(files[i])).promise;
                        document.getElementsByClassName("canvas")[0].style.display = null;
                        document.getElementsByClassName("fileOpenBox")[0].style.display = "none";
                        viewer.setPage(1);

                        document.getElementsByClassName("numPages")[0].innerText = viewer.numPages;
                    }
                }
                break;
            }
        }
    };

    const sizeFitValue = () => {
        const text = document.getElementsByClassName("currentPageWidth")[0];
        const input = document.getElementsByClassName("currentPage")[0];
        text.innerText = input.value;
        input.style.width = `${text.offsetWidth}px`;
    };

    const onDirectionChanged = async nowDirection => {
        if(reader == null && doc == null || nowDirection != 1 && nowDirection != -1 || nowPage + nowDirection < 1 || nowPage + nowDirection > viewer.numPages || nowPage + nowDirection == loadingPage) return;
        const pageViewers = document.getElementsByClassName("pageViewer");
        loadingPage = nowPage + nowDirection;
        cleanPageViewers();
        if(timeout != null) clearTimeout(timeout);

        const scrollTarget = document.getElementsByClassName("containerViewer")[0];
        const container = document.getElementsByClassName("pageContainer")[0];

        if(direction + nowDirection === 0 && pageViewers.length >= 2) {
            let target, destroy, imageCanvas, destroyImageCanvas;
            if(direction == -1) {
                scrollTarget.scrollLeft = 0;
                destroy = pageViewers[0];
                target = pageViewers[1];

                imageCanvas = target.getElementsByClassName("imageCanvas")[0];
                imageCanvas.style.left = "0";
                imageCanvas.style.right = null;

                destroyImageCanvas = destroy.getElementsByClassName("imageCanvas")[0];
                destroyImageCanvas.style.left = null;
                destroyImageCanvas.style.right = "0";
            }else {
                scrollTarget.scrollLeft = scrollTarget.scrollWidth;
                destroy = pageViewers[1];
                target = pageViewers[0];
                imageCanvas = target.getElementsByClassName("imageCanvas")[0];
                imageCanvas.style.left = null;
                imageCanvas.style.right = "0";

                destroyImageCanvas = destroy.getElementsByClassName("imageCanvas")[0];
                destroyImageCanvas.style.left = "0";
                destroyImageCanvas.style.right = null;
            }
            destroy.setAttribute("hide", true);
            setHideViewer(target, false);
    
            imageCanvas.style.width = `${container.offsetWidth}px`;
            imageCanvas.style.height = `${container.offsetHeight}px`;
            
            timeout = setTimeout(() => {
                if(destroy) {
                    const canvasList = destroy.getElementsByTagName("canvas");
                    const imageList = destroy.getElementsByTagName("img");
                    for(let i = 0, len = imageList.length; i < len; i++) imageList[i].cancel = true;
                    for(let i = 0, len = canvasList.length; i < len; i++) canvasList[i].cancel = true;

                    destroy.remove();
                }
                direction = 0;
                if(imageCanvas) {
                    imageCanvas.style.width = null;
                    imageCanvas.style.height = null;
                }
            }, DELAY);

            nowPage -= direction;
            direction = nowDirection;

            setPageInfo();

            delete prevWorker.prevLoadingComplete[nowPage - 1];
            delete prevWorker.prevLoading[nowPage - 1];
            cleanAndPrevLoad(nowPage);
            return;
        }

        const pageViewer = getPDFPageView(nowPage + nowDirection);
        
        if(direction == nowDirection && pageViewers.length >= 2) {
            let destroy = pageViewers[0];
            if(direction == -1) {
                destroy = pageViewers[1];
            }

            if(destroy) {
                const canvasList = destroy.getElementsByTagName("canvas");
                const imageList = destroy.getElementsByTagName("img");
                for(let i = 0, len = imageList.length; i < len; i++) imageList[i].cancel = true;
                for(let i = 0, len = canvasList.length; i < len; i++) canvasList[i].cancel = true;
                destroy.remove();
            }
        }
        
        const imageCanvas = pageViewer.getElementsByClassName("imageCanvas")[0];

        setHideViewer(pageViewer, true, `${container.offsetWidth - 10}px`, `${container.offsetHeight}px`);

        const loc = document.getElementsByClassName("pageContainer")[0];

        const destroy = pageViewers[0];
        if(destroy == null) {
            pageViewer.removeAttribute("hide");
            loc.appendChild(pageViewer);
        }
        else {
            if(nowDirection == -1) {
                scrollTarget.scrollLeft = scrollTarget.scrollWidth;
                imageCanvas.style.right = "0";
                destroy.getElementsByClassName("imageCanvas")[0].style.left = "0";
                destroy.getElementsByClassName("imageCanvas")[0].style.right = null;
                loc.insertBefore(pageViewer, destroy);
            }else {
                scrollTarget.scrollLeft = 0;
                imageCanvas.style.left = "0";
                destroy.getElementsByClassName("imageCanvas")[0].style.left = null;
                destroy.getElementsByClassName("imageCanvas")[0].style.right = "0";
                loc.appendChild(pageViewer);
            }
            setHideViewer(destroy, true);
            pageViewer.removeAttribute("hide");
        }

        timeout = setTimeout(() => {
            if(destroy) {
                const canvasList = destroy.getElementsByTagName("canvas");
                const imageList = destroy.getElementsByTagName("img");
                for(let i = 0, len = imageList.length; i < len; i++) imageList[i].cancel = true;
                for(let i = 0, len = canvasList.length; i < len; i++) canvasList[i].cancel = true;

                destroy.remove();
            }
            direction = 0;

            if(imageCanvas) {
                imageCanvas.style.width = null;
                imageCanvas.style.height = null;
                imageCanvas.style.left = null;
                imageCanvas.style.right = null;
            }
        }, DELAY);

        nowPage += direction = nowDirection;
        setPageInfo();

        delete prevWorker.prevLoadingComplete[nowPage - 1];
        delete prevWorker.prevLoading[nowPage - 1];
        cleanAndPrevLoad(nowPage);
    };

    window.ondragover = () => {
        event.stopPropagation();
        event.preventDefault();
    };

    window.ondrop = async e => {
        event.stopPropagation();
        event.preventDefault();
        if(doc != null) return;
        getDocument(e.target.files || e.dataTransfer.files);
    };

    window.oncontextmenu = e => {
        e.preventDefault();
    }

    window.onkeydown = e => {
        if(reader == null && doc == null || document.getElementsByClassName("currentPage")[0].isFocus) return;
        const now = Date.now();
        if(e.keyCode == 37) {
            if(now - beforeKeyPressTime > 50) {
                onDirectionChanged(-1);
                viewer.showMenu();
                beforeKeyPressTime = now;
            }
        }else if(e.keyCode == 39) {
            if(now - beforeKeyPressTime > 50) {
                onDirectionChanged(1);
                viewer.showMenu();
                beforeKeyPressTime = now;
            }
        }else if(e.keyCode == 36) {
            viewer.setPage(1);
            viewer.showMenu();
        }else if(e.keyCode == 35) {
            viewer.setPage(viewer.numPages);
            viewer.showMenu();
        }
    }

    window.onmousedown = e => {
        pointerData.x = e.clientX;
        pointerData.y = e.clientY;
        pointerData.startClickTime = Date.now();
    };

    window.onmousemove = e => {
        if(document.getElementsByClassName("scrollBar")[0].touched) {
            scrollChange(e.clientX);
        }
    };

    window.onmouseup = e => {
        if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

        if(document.getElementsByClassName("scrollBar")[0].touched) {
            endScrollMove();
            return;
        }

        const now = Date.now();
        if(now - pointerData.beforeScrolledTime < 50 || now - pointerData.beforeClickedTime < 20) return;

        const between = e.clientX - pointerData.x;

        const percentWidth = window.innerWidth * 0.2;
        if(window.innerWidth < 790 && Date.now() - pointerData.startClickTime < 150 && (!document.getElementsByClassName("menu")[0].hasAttribute("show") || window.innerHeight - 40 >= e.clientY)) {
            if(e.clientX >= window.innerWidth - percentWidth) {
                pointerData.beforeClickedTime = now;
                onDirectionChanged(1);
                return;
            }else if(e.clientX <= percentWidth) {
                pointerData.beforeClickedTime = now;
                onDirectionChanged(-1);
                return;
            }
        }

        if(Math.abs(between) < window.innerWidth * 0.085) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus && Math.abs(e.clientY - pointerData.y) < window.innerHeight * 0.09) viewer.showMenu();
            return;
        }

        const dir = between < 0 ? 1 : -1;
        onDirectionChanged(dir);
        pointerData.beforeClickedTime = now;
    };

    window.ontouchstart = e => {
        if(document.getElementsByClassName("scrollBar")[0].touched && e.touches.length > 1) {
            endScrollMove();
        }

        pointerData.x = e.touches[0].screenX;
        pointerData.y = e.touches[0].screenY;
        pointerData.startClickTime = Date.now();

        if(e.touches.length > 1) {
            dragPageMove = false;
        }else {
            dragPageMove = true;
        }

        if(e.touches.length == 2) {
            touchMoveData.beforeDistance = -1;
        }
    };

    window.ontouchmove = e => {
        if(document.getElementsByClassName("scrollBar")[0].touched) {
            scrollChange(e.touches[0].clientX);
        }

        const target = document.getElementsByClassName("containerViewer")[0];

        if(e.touches.length != 2) {
            offset.x = target.scrollLeft;
            offset.y = target.scrollTop;
            return;
        }

        const nowDistance = Math.abs(Math.sqrt((e.touches[0].screenX - e.touches[1].screenX) ** 2 + (e.touches[0].screenY - e.touches[1].screenY) ** 2));
        const changeZoomPercent = (nowDistance - touchMoveData.beforeDistance) / 40;
        
        const screenX = (e.touches[0].pageX + e.touches[1].pageX) / 2;
        const screenY = (e.touches[0].pageY + e.touches[1].pageY) / 2;

        if(Math.abs(changeZoomPercent) <= 0.003 || touchMoveData.beforeDistance < 0 || isNaN(changeZoomPercent)) {
            touchMoveData.beforeDistance = nowDistance;
            touchMoveData.beforeX = screenX;
            touchMoveData.beforeY = screenY;
            return;
        }

        let changedAmount = touchMoveData.nowZoomScale;
        touchMoveData.nowZoomScale += changeZoomPercent;
        touchMoveData.nowZoomScale = clamp(touchMoveData.nowZoomScale, 1, touchMoveData.maxZoomScale);
        changedAmount = touchMoveData.nowZoomScale - changedAmount;

        document.getElementsByClassName("pageContainer")[0].style.width = `${touchMoveData.nowZoomScale * 100}%`;
        document.getElementsByClassName("pageContainer")[0].style.height = `${touchMoveData.nowZoomScale * 100}%`;

        if(touchMoveData.beforeX == -1 || touchMoveData.beforeY == -1) {
            touchMoveData.beforeX = screenX;
            touchMoveData.beforeY = screenY;
        }else if(Math.abs(changedAmount) > 0.005) {
            const changeX = changedAmount * (screenX + offset.x) / touchMoveData.nowZoomScale;
            const changeY = changedAmount * (screenY + offset.y) / touchMoveData.nowZoomScale;

            offset.x += changeX;
            offset.y += changeY;
            offset.x = clamp(offset.x, 0, target.scrollWidth - window.innerHeight / 2);
            offset.y = clamp(offset.y, 0, target.scrollHeight - window.innerHeight / 2);

            if(changedAmount < 0) {
                target.scrollLeft = offset.x;
                target.scrollTop = offset.y;
            }else if(changedAmount > 0) {
                target.scrollLeft = offset.x;
                target.scrollTop = offset.y;
            }
        }

        touchMoveData.beforeDistance = nowDistance;
        touchMoveData.beforeX = screenX;
        touchMoveData.beforeY = screenY;
    };

    window.ontouchend = e => {
        if(e.touches.length == 2) {
            touchMoveData.beforeDistance = -1;
        }

        if(document.getElementsByClassName("scrollBar")[0].touched) {
            endScrollMove();
        
            if(!dragPageMove) {
                if(e.touches.length == 0) dragPageMove = true;
            }
            return;
        }
        
        if(!dragPageMove) {
            if(e.touches.length == 0) dragPageMove = true;
            return;
        }
        
        const now = Date.now();
        if(now - pointerData.beforeScrolledTime < 50 || now - pointerData.beforeClickedTime < 100) return;

        const between = e.changedTouches[0].screenX - pointerData.x;
        const percentWidth = window.innerWidth * 0.12;
        if(Math.abs(e.changedTouches[0].screenY - pointerData.y) < Math.min(100, percentWidth) && Math.abs(between) < Math.min(100, percentWidth) && (!document.getElementsByClassName("menu")[0].hasAttribute("show") || window.innerHeight - 40 >= e.changedTouches[0].clientY)) {
            if(window.innerWidth < 790 && e.changedTouches[0].pageX >= window.innerWidth - percentWidth) {
                pointerData.beforeScrolledTime = now;
                onDirectionChanged(1);
                return;
            }else if(window.innerWidth < 790 && e.changedTouches[0].screenX <= percentWidth) {
                pointerData.beforeScrolledTime = now;
                onDirectionChanged(-1);
                return;
            }
        }

        if(Math.abs(between) < window.innerWidth * 0.085) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus && Math.abs(e.changedTouches[0].screenY - pointerData.y) < window.innerHeight * 0.09) viewer.showMenu();
            return;
        }

        const dir = between < 0 ? 1 : -1;
        onDirectionChanged(dir);
        pointerData.beforeScrolledTime = now;
    };

    document.onfullscreenchange = () => {
        const fullMenu = document.getElementsByClassName("fullModeMenu")[0];
        if(!document.fullscreenElement) {
            fullMenu.removeAttribute("full");
        }else {
            if(!Object.values(document.fullscreenElement.classList).includes("canvas")) {
                viewer.toggleFullScreen();
            }
            fullMenu.setAttribute("full", true);
        }
    }

    document.getElementsByClassName("fullModeState")[0].onclick = document.getElementsByClassName("fullModeState")[1].onclick = e => {
        e.preventDefault();
        viewer.toggleFullScreen();
    };

    document.getElementsByClassName("scroller")[0].onmousedown = e => {
        clearInterval(showTimeout);
        document.getElementsByClassName("menu")[0].setAttribute("show", true);
        scrollChange(e.clientX);

        document.getElementsByClassName("scrollBar")[0].touched = true;
    };

    document.getElementsByClassName("scroller")[0].ontouchstart = e => {
        if(e.touches.length > 1) return;

        clearInterval(showTimeout);
        document.getElementsByClassName("menu")[0].setAttribute("show", true);
        scrollChange(e.clientX);
        
        document.getElementsByClassName("scrollBar")[0].touched = true;
    };

    document.getElementsByClassName("fileOpenBoxContentBox")[0].onclick = () => {
        document.getElementsByClassName("fileInput")[0].click();
    };

    document.getElementsByClassName("fileInput")[0].onchange = e => {
        getDocument(e.target.files || e.dataTransfer.files);
        e.target.value = null;
    };

    document.getElementsByClassName("leftPageMoveBox")[0].onclick = () => {
        viewer.setPage(nowPage - 1);
    };

    document.getElementsByClassName("rightPageMoveBox")[0].onclick = () => {
        viewer.setPage(nowPage + 1);
    };

    document.getElementsByClassName("currentPage")[0].onfocus = () => {
        document.getElementsByClassName("currentPage")[0].isFocus = true;
        if(showTimeout != null) clearTimeout(showTimeout);
    };

    document.getElementsByClassName("currentPage")[0].onblur = () => {
        document.getElementsByClassName("currentPage")[0].isFocus = false;
        document.getElementsByClassName("currentPage")[0].value = Math.abs(document.getElementsByClassName("currentPage")[0].value);
        sizeFitValue();
        viewer.setPage(parseInt(document.getElementsByClassName("currentPage")[0].value));

        viewer.showMenu();
    };

    document.getElementsByClassName("currentPage")[0].onkeypress = e => {
        if(document.getElementsByClassName("currentPage")[0].value.length >= 8) e.preventDefault();
        sizeFitValue();
        if(e.keyCode == 13) document.getElementsByClassName("currentPage")[0].blur();
    }

    document.getElementsByClassName("currentPage")[0].oninput = e => {
    }

    document.getElementsByClassName("currentPage")[0].onkeyup = e => {
        sizeFitValue();
        if(e.keyCode == 13) document.getElementsByClassName("currentPage")[0].blur();
    }

    document.getElementsByClassName("currentPage")[0].onchange = () => {
        document.getElementsByClassName("currentPage")[0].value = Math.abs(document.getElementsByClassName("currentPage")[0].value);
        sizeFitValue();
        viewer.setPage(parseInt(document.getElementsByClassName("currentPage")[0].value));
    }

    document.getElementsByClassName("containerViewer")[0].onscroll = () => {
        const nowScrollLeft = document.getElementsByClassName("containerViewer")[0].scrollLeft;
        if(Math.abs(nowScrollLeft - beforeViewportPageLeft)) pointerData.beforeScrolledTime = Date.now();
        
        beforeViewportPageLeft = document.getElementsByClassName("containerViewer")[0].scrollLeft;
    }
    
    var viewer = new class {
        get currentPage() {
            return nowPage;
        }

        get numPages() {
            if(reader) return reader.numPages;
            if(doc) return doc.numPages;
            return 0;
        }

        get zoomScale() {
            return touchMoveData.nowZoomScale;
        }

        get prevLoading() {
            return prevWorker.prevLoading;
        }

        get prevLoadingComplete() {
            return prevWorker.prevLoadingComplete;
        }

        setPage(page) {
            if(page == null) return;
            if(reader == null && doc == null) return;
            const numPages = this.numPages;
            if(page > numPages) page = numPages;
            if(page < 1) page = 1;
            if(page == nowPage) return;

            cleanPageViewers();
            if(timeout != null) clearTimeout(timeout);
            
            const pageViewers = document.getElementsByClassName("pageViewer");

            let target = pageViewers[0];
            if(direction == 1 && pageViewers.length >= 2) target = pageViewers[1];

            if(target == null) {
                target = getPDFPageView(page);
                document.getElementsByClassName("pageContainer")[0].appendChild(target);
            }else {
                target.setAttribute("pageInfo", page);
                const canvasList = target.getElementsByTagName("canvas");
                const imageList = target.getElementsByTagName("img");
                while(canvasList.length > 0) {
                    canvasList[0].cancel = true;
                    canvasList[0].remove();
                }
                while(imageList.length > 0) {
                    imageList[0].cancel = true;
                    imageList[0].remove();
                }
                target.getElementsByClassName("imageCanvas")[0].appendChild(getPDFPageCanvas(page));
            }

            nowPage = page;
            setPageInfo();

            document.getElementsByClassName("pageContainer")[0].style.width = null;
            document.getElementsByClassName("pageContainer")[0].style.height = null;

            delete prevWorker.prevLoadingComplete[nowPage - 1];
            delete prevWorker.prevLoading[nowPage - 1];
            cleanAndPrevLoad(page);
        }

        showMenu() {
            if(showTimeout != null) clearTimeout(showTimeout);
            const menu = document.getElementsByClassName("menu")[0];
            menu.setAttribute("show", true);

            showTimeout = setTimeout(() => {
                menu.removeAttribute("show");
            }, 2100);
        }

        toggleFullScreen() {
            if(document.fullscreenElement == null || !Object.values(document.fullscreenElement.classList).includes("canvas")) {
                const canvas = document.getElementsByClassName("canvas")[0];
                canvas.requestFullscreen() || canvas.webkitRequestFullscreen() || canvas.mozRequestFullScreen() || canvas.msRequestFullscreen();
            }else {
                document.exitFullscreen() || document.webkitExitFullscreen() || document.mozCancelFullScreen() || document.msExitFullscreen();
            }
        }
    }

    return viewer;
};

const viewer = PageViewer();