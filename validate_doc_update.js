function (newDoc, oldDoc, userCtx) {

  if (userCtx.roles.indexOf('_admin') != -1) {
    return;
  }

  if( oldDoc !== null ) {
    throw {
      forbidden: "existing pastes cannot be changed."
    };
  }

  if( !(newDoc.date && newDoc.paste && newDoc.title) ) {
    throw {
      forbidden: "Cannot post empty paste"
    };
  }

  return true;
}
