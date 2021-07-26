const lang = {
    ko: {
        description: "PDF 뷰어. 드래그 앤 드롭을 통해 PDF를 볼 수 있습니다.",
        file: "PDF 파일 열기\n(혹은 드래그 드롭)",
    },
    jp: {
        description: "PDFビューアー。ドラッグアンドドロップでPDFを見ることができます。",
        file: "Open PDF file\n(or Drag and Drop)",
    },
    en: {
        description: "PDF Viewer. You can view PDFs through drag and drop.",
        file: "PDFファイルを開く\n(あるいはドラッグアンドドロップ)",
    },
}

const languageSetting = userLang => {
    switch(userLang) {
        case "ko": case "ko-KR": {
            document.head.querySelector("meta[name=\"og:description\"]").setAttribute("content", lang.ko.description);
            document.body.querySelector(".fileOpenBoxContentBox [data-lang]").innerText = lang.ko.file;
            break;
        }
        case "ja": case "ja-JP": {
            document.head.querySelector("meta[name=\"og:description\"]").setAttribute("content", lang.jp.description);
            document.body.querySelector(".fileOpenBoxContentBox [data-lang]").innerText = lang.jp.file;
            break;
        }
        default: {
            document.head.querySelector("meta[name=\"og:description\"]").setAttribute("content", lang.en.description);
            document.body.querySelector(".fileOpenBoxContentBox [data-lang]").innerText = lang.en.file;
            break;
        }
    }
}

languageSetting(navigator.language || navigator.userLanguage);

window.onlanguagechange = () => {
    languageSetting(navigator.language || navigator.userLanguage);
};