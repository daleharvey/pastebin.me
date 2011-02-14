function(doc, req) {
    return {
        body: doc.paste,
        headers: {
            "Content-Type" : "text/html"
        }
    };
};