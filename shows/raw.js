function(doc, req) {

  respondWith(req, {
    html : function() {
      return {body:doc.paste};
    }
  });
};