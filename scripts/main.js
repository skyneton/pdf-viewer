const PageViewer = () => {
    let direction = 0;
    let clickedX = 0;
    let timeout;
    let doc;
    let nowPage = 1;
    const DELAY = 650;
    let showTimeout;

    const cleanPageViewers = () => {
        const pageViewers = [...document.getElementsByClassName("pageViewer")];
        for(let i = 0; i < pageViewers.length; i++) {
            if(pageViewers[i].offsetWidth === 0 || pageViewers[i].getElementsByTagName("img").length <= 0) pageViewers[i].remove();
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

    const getPDFPageImage = async i => {
        const imageBox = document.createElement("div");
        imageBox.setAttribute("class", "pageViewer");
        const image = document.createElement("img");

        imageBox.appendChild(image);

        const pdfPageData = await getPDFPageBlobUrl(i);
        image.src = pdfPageData.url;
        image.viewportWidth = pdfPageData.width;
        image.viewportHeight = pdfPageData.height;

        return imageBox;
    };

    const setHideViewer = (viewer, value) => {
        const image = viewer.getElementsByTagName("img")[0]
        if(value) {
            image.style.width = `${image.offsetWidth}px`;
            image.style.height = `${image.offsetHeight}px`;
            viewer.setAttribute("hide", true);
        }else {
            viewer.removeAttribute("hide");
            if(image) {
                image.style.width = null;
                image.style.height = null;
            }
        }
    }

    const onDirectionChanged = async nowDirection => {
        if(doc == null || nowPage + nowDirection < 1 || nowPage + nowDirection > doc.numPages) return;
        const pageViewers = document.getElementsByClassName("pageViewer");
        cleanPageViewers();
        if(timeout != null) clearTimeout(timeout);

        if(direction == nowDirection && pageViewers.length >= 2) {
            if(direction == -1) {
                const imageSrc = pageViewers[1].getElementsByTagName("img")[0].src;
                imageSrc != null && URL.revokeObjectURL(imageSrc);
                pageViewers[1].remove();
            }
            else {
                const imageSrc = pageViewers[0].getElementsByTagName("img")[0].src;
                imageSrc != null && URL.revokeObjectURL(imageSrc);
                pageViewers[0].remove();
            }
        }
        if(direction + nowDirection === 0 && pageViewers.length >= 2) {
            if(direction == -1) {
                setHideViewer(pageViewers[0], true);
                setHideViewer(pageViewers[1], false);
                timeout = setTimeout(() => {
                    const imageSrc = pageViewers[0].getElementsByTagName("img")[0].src;
                    imageSrc != null && URL.revokeObjectURL(imageSrc);
                    pageViewers[0].remove();
                }, DELAY);
            }else {
                setHideViewer(pageViewers[0], false);
                setHideViewer(pageViewers[1], true);
                timeout = setTimeout(() => {
                    const imageSrc = pageViewers[1].getElementsByTagName("img")[0].src;
                    imageSrc != null && URL.revokeObjectURL(imageSrc);
                    pageViewers[1].remove();
                }, DELAY);
            }
        }

        

        document.getElementsByClassName("currentPage")[0].value = nowPage += nowDirection;
        sizeFitValue();

        const imageBox = await getPDFPageImage(nowPage);
        imageBox.style.width = "0px";
        
        const image = imageBox.getElementsByTagName("img")[0];

        const pageViewerWidth = pageViewers[0].offsetWidth;
        const pageViewerHeight = pageViewers[0].offsetHeight;
        const widthScale = pageViewerWidth / image.viewportWidth;
        const heightScale = pageViewerHeight / image.viewportHeight;

        const widthScaleX = image.viewportWidth * widthScale;
        const widthScaleY = image.viewportHeight * widthScale;
        const heightScaleX = image.viewportWidth * heightScale;
        const heightScaleY = image.viewportHeight * heightScale;

        image.style.maxWidth = "none";
        image.style.maxHeight = "none";


        if(widthScaleX > pageViewerWidth || widthScaleY > pageViewerHeight) {
            image.style.width = `${heightScaleX}px`;
            image.style.height = `${heightScaleY}px`;
        }
        else if(heightScaleX > pageViewerWidth || heightScaleY > pageViewerHeight) {
            image.style.width = `${widthScaleX}px`;
            image.style.height = `${widthScaleY}px`;
        }
        else {
            if(widthScaleX > heightScaleX) {
                image.style.width = `${widthScaleX}px`;
                image.style.height = `${widthScaleY}px`;
            }else {
                image.style.width = `${heightScaleX}px`;
                image.style.height = `${heightScaleY}px`;
            }
        }

        setHideViewer(pageViewers[0], true);

        const loc = document.getElementsByClassName("pageContainer")[0];

        if(nowDirection == -1) {
            loc.insertBefore(imageBox, pageViewers[0]);
            imageBox.style.width = null;

            setTimeout(() => {
                if(image) {
                    image.style.width = null;
                    image.style.height = null;
                    image.style.maxWidth = null;
                    image.style.maxHeight = null;
                }
            }, DELAY);

            timeout = setTimeout(() => {
                const imageSrc = pageViewers[1].getElementsByTagName("img")[0].src;
                imageSrc != null && URL.revokeObjectURL(imageSrc);
                pageViewers[1].remove();
            }, DELAY);
        }else {
            loc.appendChild(imageBox);
            imageBox.style.width = null;

            setTimeout(() => {
                if(image) {
                    image.style.width = null;
                    image.style.height = null;
                    image.style.maxWidth = null;
                    image.style.maxHeight = null;
                }
            }, DELAY);

            timeout = setTimeout(() => {
                const imageSrc = pageViewers[0].getElementsByTagName("img")[0].src;
                imageSrc != null && URL.revokeObjectURL(imageSrc);
                pageViewers[0].remove();
            }, DELAY);
        }

        direction = nowDirection;
    };

    window.onmousedown = e => {
        clickedX = e.clientX;
    };

    window.onmouseup = e => {
        const between = e.clientX - clickedX;
        if(Math.abs(between) < window.innerWidth * 0.1) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus) viewer.showMenu();
            return;
        }
        const dir = between < 0 ? 1 : -1;
        onDirectionChanged(dir);
    };

    window.ontouchstart = e => {
        clickedX = e.touches[0].clientX;
    };

    window.ontouchend = e => {
        const between = e.changedTouches[0].clientX - clickedX;
        if(Math.abs(between) < window.innerWidth * 0.1) {
            if(!document.getElementsByClassName("currentPage")[0].isFocus) viewer.showMenu();
            return;
        }
        const dir = between < 0 ? 1 : -1;
        onDirectionChanged(dir);
    };
    
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

            const image = target.getElementsByTagName("img")[0];
            image.src = (await getPDFPageBlobUrl(page)).url;

            document.getElementsByClassName("currentPage")[0].value = nowPage = page;
            sizeFitValue();
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