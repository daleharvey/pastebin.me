// an example map function, emits the doc id test
// and the list of keys it contains
// !code lib/helpers/math.js

function(doc) {
  if( doc.paste ) {
    emit(doc.date, {id:doc._id, title:doc.title});
  }
};