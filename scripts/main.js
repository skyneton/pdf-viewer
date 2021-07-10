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
    let beforeViewportPageLeft = visualViewport.pageLeft;

    const cleanPageViewers = () => {
        const pageViewers = [...document.getElementsByClassName("pageViewer")];
        for(let i = 0; i < pageViewers.length; i++) {
            if(pageViewers[i].offsetWidth === 0 || pageViewers[i].getElementsByTagName("img").length <= 0 || !pageViewers[i].hasAttribute("hide") && pageViewers[i].hasAttribute("pageInfo") && pageViewers[i].getAttribute("pageInfo") != nowPage)
                pageViewers[i].remove();
        }
    };

    const getPDFPageBlobUrl = async i => {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({scale: 1});

        const canvas = new OffscreenCanvas(viewport.width, viewport.height);

        await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
        return {
            url: URL.createObjectURL(await canvas.convertToBlob({type: "image/jpeg"})),
            width: viewport.width,
            height: viewport.height,
        }
    };

    const getPDFPageImage = i => {
        return new Promise(async resolve => {
            const imageBox = document.createElement("div");
            imageBox.setAttribute("class", "pageViewer");
            imageBox.setAttribute("pageInfo", i);

            const image = document.createElement("img");
    
            const imageCanvas = document.createElement("div");
            imageCanvas.setAttribute("class", "imageCanvas");
    
            imageCanvas.appendChild(image);
            imageBox.appendChild(imageCanvas);
    
            const pdfPageData = await getPDFPageBlobUrl(i);
            image.src = pdfPageData.url;
            image.viewportWidth = pdfPageData.width;
            image.viewportHeight = pdfPageData.height;
    
            image.onload = () => {
                URL.revokeObjectURL(image.src);
                resolve(imageBox);
            };
        });
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

    const onDirectionChanged = async nowDirection => {
        if(doc == null || nowDirection != 1 && nowDirection != -1 || nowPage + nowDirection < 1 || nowPage + nowDirection > doc.numPages || nowPage + nowDirection == loadingPage) return;
        const pageViewers = document.getElementsByClassName("pageViewer");
        loadingPage = nowPage + nowDirection;
        cleanPageViewers();
        if(timeout != null) clearTimeout(timeout);

        if(direction + nowDirection === 0 && pageViewers.length >= 2) {
            let target, destroy, imageCanvas, destroyImageCanvas;
            if(direction == -1) {
                destroy = pageViewers[0];
                target = pageViewers[1];

                imageCanvas = target.getElementsByClassName("imageCanvas")[0];
                imageCanvas.style.left = "0";
                imageCanvas.style.right = null;

                destroyImageCanvas = destroy.getElementsByClassName("imageCanvas")[0];
                destroyImageCanvas.style.left = null;
                destroyImageCanvas.style.right = "0";
            }else {
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

        
        const subwidth = window.innerWidth >= 790 ? 150 : 0;
        const imageCanvas = pageViewer.getElementsByClassName("imageCanvas")[0];

        setHideViewer(pageViewer, true, `${window.innerWidth - subwidth - 10}px`, `${window.innerHeight}px`);

        const loc = document.getElementsByClassName("pageContainer")[0];

        const destroy = pageViewers[0];
        if(destroy == null) {
            pageViewer.removeAttribute("hide");
            loc.appendChild(pageViewer);
        }
        else {
            if(nowDirection == -1) {
                imageCanvas.style.right = "0";
                destroy.getElementsByClassName("imageCanvas")[0].style.left = "0";
                destroy.getElementsByClassName("imageCanvas")[0].style.right = null;
                loc.insertBefore(pageViewer, destroy);
            }else {
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

        direction = nowDirection;
        document.getElementsByClassName("currentPage")[0].value = nowPage += nowDirection;
        sizeFitValue();

        if(document.fullscreenElement == null) {
            const canvas = document.getElementsByClassName("canvas")[0];
            canvas.requestFullscreen() || canvas.webkitRequestFullscreen() || canvas.mozRequestFullScreen() || canvas.msRequestFullscreen();
            document.exitFullscreen() || document.webkitExitFullscreen() || document.mozCancelFullScreen() || document.msExitFullscreen();
        }
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
        clicked.x = e.screenX;
        clicked.y = e.screenY;
        clicked.startClickTime = Date.now();
    };

    window.onmouseup = e => {
        const between = e.screenX - clicked.x;
        if(Math.abs(between) < window.innerWidth * 0.085) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus && Math.abs(e.screenY - clicked.y) < window.innerHeight * 0.09) viewer.showMenu();
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
    };

    window.ontouchend = e => {
        const between = e.changedTouches[0].screenX - clicked.x;
        if(Math.abs(between) < window.innerWidth * 0.085) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus && Math.abs(e.changedTouches[0].screenY - clicked.y) < window.innerHeight * 0.09) viewer.showMenu();
            return;
        }
        if(Date.now() - beforeScrolledTime < 20) return;

        const dir = between < 0 ? 1 : -1;
        onDirectionChanged(dir);
    };

    window.oncontextmenu = e => {
        e.preventDefault();
    }

    visualViewport.onscroll = () => {
        if(Math.abs(visualViewport.pageLeft - beforeViewportPageLeft))
            beforeScrolledTime = Date.now();

        beforeViewportPageLeft = visualViewport.pageLeft;
    }

    visualViewport.onresize = () => {
        beforeScrolledTime = Date.now();
        beforeViewportPageLeft = visualViewport.pageLeft;
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

    window.ondragover = () => {
        event.stopPropagation();
        event.preventDefault();
    };

    window.ondrop = async e => {
        event.stopPropagation();
        event.preventDefault();
        if(doc != null) return;
        const files = e.target.files || e.dataTransfer.files;
        for(let i = 0; i < files.length; i++) {
            if(files[i].type === "application/pdf") {
                doc = await pdfjsLib.getDocument(await fileReaderAsync(files[i])).promise;
                document.getElementsByClassName("canvas")[0].style.display = null;
                document.getElementsByClassName("fileInput")[0].style.display = "none";
                viewer.setPage(1);

                document.getElementsByClassName("numPages")[0].innerText = doc.numPages;
                break;
            }
        }
    };

    document.getElementsByClassName("fileInput")[0].onchange = async e => {
        const files = e.target.files;
        for(let i = 0; i < files.length; i++) {
            if(files[i].type === "application/pdf") {
                doc = await pdfjsLib.getDocument(await fileReaderAsync(files[i])).promise;
                document.getElementsByClassName("canvas")[0].style.display = null;
                document.getElementsByClassName("fileInput")[0].style.display = "none";
                viewer.setPage(1);

                document.getElementsByClassName("numPages")[0].innerText = doc.numPages;
                break;
            }
        }
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

                const image = target.getElementsByTagName("img")[0];
                image.src = (await getPDFPageBlobUrl(page)).url;

                image.onload = () => {
                    URL.revokeObjectURL(image.src);
                }
            }

            document.getElementsByClassName("currentPage")[0].value = nowPage = page;
            sizeFitValue();
            
            if(document.fullscreenElement == null) {
                const canvas = document.getElementsByClassName("canvas")[0];
                canvas.requestFullscreen() || canvas.webkitRequestFullscreen() || canvas.mozRequestFullScreen() || canvas.msRequestFullscreen();
                document.exitFullscreen() || document.webkitExitFullscreen() || document.mozCancelFullScreen() || document.msExitFullscreen();
            }
        }

        showMenu() {
            if(showTimeout != null) clearTimeout(showTimeout);
            const menu = document.getElementsByClassName("menu")[0];
            menu.setAttribute("show", true);

            showTimeout = setTimeout(() => {
                menu.removeAttribute("show");
            }, 2000);
        }
    }

    return viewer;
};

const viewer = PageViewer();