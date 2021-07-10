const PageViewer = () => {
    let direction = 0;
    const clicked = {x: 0, y: 0, startClickTime: Date.now()};
    let timeout;
    let doc;
    let nowPage = 1;
    const DELAY = 705;
    let showTimeout;
    let loadingPage;
    let beforeScrolledTime = Date.now();
    let beforeViewportPageLeft = 0;
    let dragPageMove = true;

    const maxZoomScale = 5;
    let nowZoomScale = 1;
    let beforeDistance = 0;

    const cleanPageViewers = () => {
        const pageViewers = [...document.getElementsByClassName("pageViewer")];
        for(let i = 0; i < pageViewers.length; i++) {
            if(pageViewers[i].offsetWidth === 0 || pageViewers[i].getElementsByTagName("canvas").length <= 0 || !pageViewers[i].hasAttribute("hide") && pageViewers[i].hasAttribute("pageInfo") && pageViewers[i].getAttribute("pageInfo") != nowPage)
                pageViewers[i].remove();
        }
    };

    const getPDFPageCanvas = async i => {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({scale: 2 * (96.0 / 72.0)});

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        page.render({
            canvasContext: canvas.getContext("2d", { alpha: false }),
            viewport,
        });

        return canvas;
    };

    const setPageInfo = () => {
        document.getElementsByClassName("currentPage")[0].value = nowPage;
        sizeFitValue();
    }

    const getPDFPageImage = async i => {
        const imageBox = document.createElement("div");
        imageBox.setAttribute("class", "pageViewer");
        imageBox.setAttribute("pageInfo", i);

        const imageCanvas = document.createElement("div");
        imageCanvas.setAttribute("class", "imageCanvas");

        imageCanvas.appendChild(await getPDFPageCanvas(i));
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
            max = min;
        }

        if(v < min) v = min;
        if(v > max) v = max;
        return v;
    }

    const onDirectionChanged = async nowDirection => {
        if(doc == null || nowDirection != 1 && nowDirection != -1 || nowPage + nowDirection < 1 || nowPage + nowDirection > doc.numPages || nowPage + nowDirection == loadingPage) return;
        const pageViewers = document.getElementsByClassName("pageViewer");
        loadingPage = nowPage + nowDirection;
        cleanPageViewers();
        if(timeout != null) clearTimeout(timeout);

        const scrollTarget = document.getElementsByClassName("containerViewer")[0];

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
    
            const subwidth = window.innerWidth >= 790 ? 150 : 0;
            imageCanvas.style.width = `${window.innerWidth - subwidth - 10}px`;
            imageCanvas.style.height = `${window.innerHeight}px`;
            
            timeout = setTimeout(() => {
                destroy.remove();
                direction = 0;
            }, DELAY);

            nowPage -= direction;
            direction = nowDirection;

            setPageInfo();
            return;
        }

        const pageViewer = await getPDFPageImage(nowPage + nowDirection);
        

        if(direction == nowDirection && pageViewers.length >= 2) {
            if(direction == -1) {
                pageViewers[1].remove();
            }
            else {
                pageViewers[0].remove();
            }
        }

        
        const imageCanvas = pageViewer.getElementsByClassName("imageCanvas")[0];

        const container = document.getElementsByClassName("pageContainer")[0];
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
    };

    window.onkeydown = e => {
        if(doc == null || document.getElementsByClassName("currentPage")[0].isFocus) return;
        if(e.keyCode == 37) {
            onDirectionChanged(-1);
            viewer.showMenu();
        }else if(e.keyCode == 39) {
            onDirectionChanged(1);
            viewer.showMenu();
        }else if(e.keyCode == 36) {
            viewer.setPage(1);
            viewer.showMenu();
        }else if(e.keyCode == 35) {
            viewer.setPage(doc.numPages);
            viewer.showMenu();
        }
    }

    window.onmousedown = e => {
        clicked.x = e.clientX;
        clicked.y = e.clientY;
        clicked.startClickTime = Date.now();
    };

    window.onmouseup = e => {
        const between = e.clientX - clicked.x;

        const percentWidth = window.innerWidth * 0.2;
        if(window.innerWidth < 790 && Date.now() - clicked.startClickTime < 150) {
            if(e.clientX >= window.innerWidth - percentWidth) {
                onDirectionChanged(1);
                return;
            }else if(e.clientX <= percentWidth) {
                onDirectionChanged(-1);
                return;
            }
        }

        if(Math.abs(between) < window.innerWidth * 0.085) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus && Math.abs(e.clientY - clicked.y) < window.innerHeight * 0.09) viewer.showMenu();
            return;
        }
        if(Date.now() - beforeScrolledTime < 20) return;

        const dir = between < 0 ? 1 : -1;
        onDirectionChanged(dir);
    };

    window.ontouchstart = e => {
        clicked.x = e.touches[0].screenX;
        clicked.y = e.touches[0].screenY;
        clicked.startClickTime = Date.now();
        if(e.touches.length > 1) {
            dragPageMove = false;
        }else {
            dragPageMove = true;
        }
    };

    window.ontouchmove = e => {
        if(e.touches.length != 2) return;
        const nowDistance = Math.sqrt((e.touches[0].screenX - e.touches[1].screenX) ** 2 - (e.touches[0].screenY - e.touches[1].screenY) ** 2);
        const changeZoomPercent = (nowDistance - beforeDistance) / 2;
        nowZoomScale += changeZoomPercent;
        let changedAmount = nowZoomScale;
        nowZoomScale = clamp(nowZoomScale, 1, maxZoomScale);
        changedAmount = nowZoomScale - changedAmount;

        document.getElementsByClassName("pageContainer")[0].style.width = `${nowZoomScale * 100}%`;
        document.getElementsByClassName("pageContainer")[0].style.height = `${nowZoomScale * 100}%`;

        const screenX = (e.touches[0].screenX + e.touches[1].screenX) / 2;
        const screenY = (e.touches[0].screenX + e.touches[1].screenX) / 2;

        const target = document.getElementsByClassName("containerViewer")[0];

        if(changedAmount < 0) {
            target.scrollLeft -= screenX;
            target.scrollTop -= screenY;
        }else if(changedAmount > 0) {
            target.scrollLeft += screenX;
            target.scrollTop += screenY;
        }

        beforeDistance = nowDistance;
    }

    window.ontouchend = e => {
        if(!dragPageMove) {
            if(e.touches.length == 0) dragPageMove = true;
            return;
        }

        const percentWidth = window.innerWidth * 0.12;
        if(window.innerWidth < 790 && e.changedTouches[0].screenX >= window.innerWidth - percentWidth) {
            onDirectionChanged(1);
            return;
        }else if(window.innerWidth < 790 && e.changedTouches[0].screenX <= percentWidth) {
            onDirectionChanged(-1);
            return;
        }

        const between = e.changedTouches[0].screenX - clicked.x;
        if(Math.abs(between) < window.innerWidth * 0.085) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus && Math.abs(e.changedTouches[0].screenY - clicked.y) < window.innerHeight * 0.09) viewer.showMenu();
            return;
        }
        if(Date.now() - beforeScrolledTime < 20) return;

        const dir = between < 0 ? 1 : -1;
        onDirectionChanged(dir);
    };

    document.onfullscreenchange = () => {
        const fullMenu = document.getElementsByClassName("fullModeMenu");
        if(!document.fullscreenElement) {
            fullMenu.removeAttribute("full");
        }else {
            if(!document.fullscreenElement.classList.includes("canvas")) {
                viewer.toggleFullScreen();
                fullMenu.setAttribute("full", true);
            }
        }
    }

    window.oncontextmenu = e => {
        e.preventDefault();
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
                window.a = doc = await pdfjsLib.getDocument(await fileReaderAsync(files[i])).promise;
                document.getElementsByClassName("canvas")[0].style.display = null;
                document.getElementsByClassName("fileInput")[0].style.display = "none";
                viewer.setPage(1);

                document.getElementsByClassName("numPages")[0].innerText = doc.numPages;
                break;
            }
        }
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

    document.getElementsByClassName("fileInput")[0].onchange = async e => {
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
        if(Math.abs(nowScrollLeft - beforeViewportPageLeft)) beforeScrolledTime = Date.now();
        
        beforeViewportPageLeft = document.getElementsByClassName("containerViewer")[0].scrollLeft;
    }

    const sizeFitValue = () => {
        const text = document.getElementsByClassName("currentPageWidth")[0];
        const input = document.getElementsByClassName("currentPage")[0];
        text.innerText = input.value;
        input.style.width = `${text.offsetWidth}px`;
    }
    
    var viewer = new class {
        get currentPage() {
            return nowPage;
        }

        async setPage(page) {
            if(page == null) return;
            if(doc == null) return;
            if(page > doc.numPages) page = doc.numPages;
            if(page < 1) page = 1;

            cleanPageViewers();
            if(timeout != null) clearTimeout(timeout);
            
            const pageViewers = document.getElementsByClassName("pageViewer");

            let target = pageViewers[0];
            if(direction == 1 && pageViewers.length >= 2) target = pageViewers[1];

            if(target == null) {
                target = await getPDFPageImage(page);
                document.getElementsByClassName("pageContainer")[0].appendChild(target);
            }else {
                target.setAttribute("pageInfo", page);
                target.getElementsByClassName("imageCanvas")[0].appendChild(await getPDFPageCanvas(page));
            }

            nowPage = page;
            setPageInfo();

            document.getElementsByClassName("pageContainer")[0].style.width = null;
            document.getElementsByClassName("pageContainer")[0].style.height = null;
        }

        showMenu() {
            if(showTimeout != null) clearTimeout(showTimeout);
            const menu = document.getElementsByClassName("menu")[0];
            menu.setAttribute("show", true);

            showTimeout = setTimeout(() => {
                menu.removeAttribute("show");
            }, 2000);
        }

        toggleFullScreen() {
            if(document.fullscreenElement == null || !document.fullscreenElement.classList.includes("canvas")) {
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