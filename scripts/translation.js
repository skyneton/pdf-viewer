const lang = {
    ko: {
        description: "PDF 뷰어. 드래그 앤 드롭을 통해 PDF를 볼 수 있습니다.",
    },
    jp: {
        description: "PDFビューアー。ドラッグアンドドロップでPDFを見ることができます。",
    },
    en: {
        description: "PDF Viewer. You can view PDFs through drag and drop.",
    },
}

const languageSetting = userLang => {
    switch(userLang) {
        case "ko": case "ko-KR": {
            document.head.querySelector("meta[name=\"og:description\"]").setAttribute("content", lang.ko.description);
            break;
        }
        case "ja": case "ja-JP": {
            document.head.querySelector("meta[name=\"og:description\"]").setAttribute("content", lang.jp.description);
            break;
        }
        default: {
            document.head.querySelector("meta[name=\"og:description\"]").setAttribute("content", lang.en.description);
            break;
        }
    }
}

languageSetting(navigator.language || navigator.userLanguage);

window.onlanguagechange = () => {
    languageSetting(navigator.language || navigator.userLanguage);
};