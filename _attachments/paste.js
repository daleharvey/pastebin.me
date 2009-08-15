Paste = function() {

  // just so I can fix the urls when deving locally
  // (cant be bothered installing nginx)
  //this.live = "";
  this.live = document.location.hostname == "pastebin.me";

  // Get the id of the post, through url or query string
  var query = Paste.parse_query(document.location.href);
  var id = (!this.live)
    ? (query ? query.paste : "")
    : document.location.pathname.split("/")[1];

  this.state = ( id !== "" )
    ? {NEW_POST:false, VIEW:"HTML", _id:id}
    : {NEW_POST:true,  VIEW:"CODE"};

  this.dom = {
    textarea:  $("#code"),
    framewrap: $("#framewrap"),
    viewcode:  $("#viewcode"),
    form:      $("#form"),
    lines:     $("#lines")
  };

  this.window_size = {
    height: 0,
    width:  0
  };

  var home = this.live ? "/" : "/pastebin/_design/pastebin.me/index.html";
  $("#new a").attr("href", home);

  this.load_recent_posts();
  this.add_events();
  this.window_resize();
  this.fill_lines();

  if( !this.state.NEW_POST ) {
    this.retrieve_post(this.state_id);
  } else {
    document.title = "Pastebin.me - New Post";
    this.dom.textarea.show();
    this.dom.lines.show();
    Paste.show_loaded();
  }
};

Paste.prototype.retrieve_post = function( id )
{
  var show = "/pastebin/_design/pastebin.me/_show/raw/";
  var that = this;

  var init = function(data)
  {
    that.dom.textarea.text( data.paste );

    if(data.paste.match(/<html/)) {
      that.state.view = "HTML";
      that.dom.viewcode.attr("checked", "checked");
      $("#paste").attr("src", show+that.state._id);
      that.dom.framewrap.show();
    } else {
      that.state.view = "CODE";
      that.dom.textarea.show();
      that.dom.lines.show();
    }
    Paste.show_loaded();
  };

  $.ajax({
    url :     "/pastebin/"+this.state._id,
    dataType: "json",
    success:  init,
    error :   function(data) { Paste.show_loaded(); }
  });
};

Paste.show_loaded = function() {
  $("#viewcode, #templates, #new, #save").show();
  Paste.setup_toggle();
};

Paste.prototype.save_paste = function()
{
  var that = this, d = new Date();

  var paste = {
    date:  d.getTime(),
    paste: this.dom.textarea.val()
  };

  $("#save").attr("disabled", "disabled").val("Saving...");

  $.ajax({
    url:      "/pastebin/",
    type:     "POST",
    data:     JSON.stringify(paste),
    dataType: "json",
    success : function(data) { document.location.href= "/"+data.id; },
    error:    function(req, status, error) { that.show_error(); }
  });
};

Paste.prototype.show_error = function()
{
  $("#save").removeAttr("disabled").val("Save");
  $("#error").html("<strong>Error!</strong><br />sorry, your paste didnt get "
                   + "through, please try again").show();
  setTimeout(function() {
    $("#error").fadeOut();
  }, 2000);
};

Paste.prototype.view_iframe = function()
{
  this.dom.textarea.hide();
  this.dom.lines.hide();

  // Overwriting old frame seemed buggy, so just make new one
  var paste = $("<iframe id=\"paste\"></iframe>");
  this.dom.framewrap.empty().append(paste).show();

  var html     = this.dom.textarea.val();
  var timer    = null;
  var framewin = paste[0].contentWindow;

  paste.width( this.window_size.width-195 ).height( this.window_size.height-93 );
  framewin.document.write(html);

  var check_loaded = function() {
    // frame got deleted between checking for load
    if( !framewin.document ) {
      window.clearInterval(timer);
    // Yay frame is loaded (nasty check)
    } else if( framewin.document.body != null ) {
      window.clearInterval(timer);
      Paste.fake_load(framewin);
    }
  };
  timer = window.setInterval( check_loaded, 20);
};

Paste.prototype.toggle = function()
{
  if( this.state.VIEW == "CODE") {
    this.view_iframe();
    this.state.VIEW = "HTML";
  } else {
    this.dom.textarea.show();
    this.dom.lines.show();
    this.dom.framewrap.hide();
    this.state.VIEW = "CODE";
  }
};

Paste.prototype.add_events = function()
{
  var that = this;

  $("#templates a").bind('mousedown', function(e) {
    that.load_template($(this).attr("name"));
    return false;
  });

  this.dom.form.bind('submit', function(e) {
    that.save_paste();
    e.preventDefault();
  });

  $(window).bind('resize', function(e) {
    that.window_resize();
  });

  this.dom.textarea.bind('scroll', function(e) {
    that.dom.lines[0].scrollTop = this.scrollTop;
  });

  this.dom.textarea.bind('keypress', function(e) {
    checkTab(e);
  });

  this.dom.viewcode.bind('change', function(e) {
    that.toggle();
    e.preventDefault();
    e.stopPropagation();
  });
};

Paste.prototype.window_resize = function()
{
  this.window_size = {
    height: $(window).height(),
    width:  $(window).width()
  };

  // All very very nasty, but I got bored trying to make table layout work
  $("#code, #paste, #lines").height(this.window_size.height - 93);
  $("#pastearea").height(this.window_size.height - 60);
  $("#lines").height(this.window_size.height - 95);

  $("#code").width(this.window_size.width-222);
  $("#paste").width(this.window_size.width-195);
};

Paste.prototype.load_template = function(tpl)
{
  var that = this;
  var url  = "/pastebin/_design/pastebin.me/tpl/";

  $.get(url+tpl+".tpl", {}, function(data) {

    that.dom.textarea.val(data);
    if( that.state.VIEW !== "CODE" ) {
      that.toggle();
    }

  }, "text");
};

Paste.prototype.load_recent_posts = function()
{
  var opts = { reduce: false, descending: true, limit:13 };
  var url  = "/pastebin/_design/pastebin.me/_view/recent";

  var root = this.live
    ? "/"
    : "/pastebin/_design/pastebin.me/index.html?paste=";

  $.get(url, opts, function(data) {
    $.each(data.rows, function() {
      var ndate = prettyDate(this.key) || "the future!";
      var date = ' <span class="subtle">('+ ndate +')</span>';
      var link = '<li><a href="'+root + this.value.id+'">'
        +ndate+'</a></li>';
      $("#postlist").append(link);
    });
  }, "json");
};

// heh this is crap. need to do properly later
Paste.prototype.fill_lines = function()
{
  for( var str = "", i = 1; i<1000; i++ ) {
    str += i + "<br />";
  }
  $("#lines").html(str);
};

// Because onload and such dont get called when dynamically setting
// an iframes content, try to fake it, need to add other libs here,
// and its always going to be buggy and nasty
Paste.fake_load = function(frame)
{
  if( typeof frame.onload == "function" ) {
    frame.onload();
  }

  if( typeof frame.jQuery == "function" ) {
    frame.jQuery.ready();
  }
};

// Sets up that iphone toggle button thing
Paste.setup_toggle = function()
{
  $('#viewcode').iphoneStyle({
    checkedLabel:      'EDIT CODE',
    uncheckedLabel:    'VIEW OUTPUT',
    resizeContainer: false,
    resizeHandle: false });
};

// Parses a query string
Paste.parse_query = function(url)
{
  var qs = url.split("?")[1];
  if( typeof qs !== "undefined" ) {
    var arr = qs.split("&"), query = {};
    for( var i = 0; i < arr.length; i++ ) {
      var tmp = arr[i].split("=");
      query[tmp[0]] = tmp[1];
    }
    return query;
  }
  return false;
};

var p = new Paste();

// Thank you http://ajaxian.com/archives/handling-tabs-in-textareas
// Set desired tab- defaults to four space softtab
var tab = "    ";

function checkTab(evt) {
    var t = evt.target;
    var ss = t.selectionStart;
    var se = t.selectionEnd;
    var oldscroll = t.scrollTop;

    // Tab key - insert tab expansion
    if (evt.keyCode == 9) {
        evt.preventDefault();

        // Special case of multi line selection
        if (ss != se && t.value.slice(ss,se).indexOf("\n") != -1) {
            // In case selection was not of entire lines (e.g. selection begins in the middle of a line)
            // we ought to tab at the beginning as well as at the start of every following line.
            var pre = t.value.slice(0,ss);
            var sel = t.value.slice(ss,se).replace(/\n/g,"\n"+tab);
            var post = t.value.slice(se,t.value.length);
            t.value = pre.concat(tab).concat(sel).concat(post);

            t.selectionStart = ss + tab.length;
            t.selectionEnd = se + tab.length;
        }

        // "Normal" case (no selection or selection on one line only)
        else {
            t.value = t.value.slice(0,ss).concat(tab).concat(t.value.slice(ss,t.value.length));
            if (ss == se) {
                t.selectionStart = t.selectionEnd = ss + tab.length;
            }
            else {
                t.selectionStart = ss + tab.length;
                t.selectionEnd = se + tab.length;
            }
        }
    }

    // Backspace key - delete preceding tab expansion, if exists
    else if (evt.keyCode==8 && t.value.slice(ss - 4,ss) == tab) {
        evt.preventDefault();

        t.value = t.value.slice(0,ss - 4).concat(t.value.slice(ss,t.value.length));
        t.selectionStart = t.selectionEnd = ss - tab.length;
    }

    // Delete key - delete following tab expansion, if exists
    else if (evt.keyCode==46 && t.value.slice(se,se + 4) == tab) {
        evt.preventDefault();

        t.value = t.value.slice(0,ss).concat(t.value.slice(ss + 4,t.value.length));
        t.selectionStart = t.selectionEnd = ss;
    }

    // Left/right arrow keys - move across the tab in one go
    else if (evt.keyCode == 37 && t.value.slice(ss - 4,ss) == tab) {
        evt.preventDefault();
        t.selectionStart = t.selectionEnd = ss - 4;
    }
    else if (evt.keyCode == 39 && t.value.slice(ss,ss + 4) == tab) {
        evt.preventDefault();
        t.selectionStart = t.selectionEnd = ss + 4;
    }

    t.scrollTop = oldscroll;
}

/*
 * JavaScript Pretty Date
 * Copyright (c) 2008 John Resig (jquery.com)
 * Licensed under the MIT license.
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time)
{
	var date = new Date(time),
		diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
		return false;

	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday" ||
		day_diff < 7 && day_diff + " days ago" ||
		day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
};

if(!this.JSON){JSON=function(){function f(n){return n<10?'0'+n:n;}
Date.prototype.toJSON=function(){return this.getUTCFullYear()+'-'+
f(this.getUTCMonth()+1)+'-'+
f(this.getUTCDate())+'T'+
f(this.getUTCHours())+':'+
f(this.getUTCMinutes())+':'+
f(this.getUTCSeconds())+'Z';};var m={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'};function stringify(value,whitelist){var a,i,k,l,r=/["\\\x00-\x1f\x7f-\x9f]/g,v;switch(typeof value){case'string':return r.test(value)?'"'+value.replace(r,function(a){var c=m[a];if(c){return c;}
c=a.charCodeAt();return'\\u00'+Math.floor(c/16).toString(16)+
(c%16).toString(16);})+'"':'"'+value+'"';case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
if(typeof value.toJSON==='function'){return stringify(value.toJSON());}
a=[];if(typeof value.length==='number'&&!(value.propertyIsEnumerable('length'))){l=value.length;for(i=0;i<l;i+=1){a.push(stringify(value[i],whitelist)||'null');}
return'['+a.join(',')+']';}
if(whitelist){l=whitelist.length;for(i=0;i<l;i+=1){k=whitelist[i];if(typeof k==='string'){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+':'+v);}}}}else{for(k in value){if(typeof k==='string'){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+':'+v);}}}}
return'{'+a.join(',')+'}';}}
return{stringify:stringify,parse:function(text,filter){var j;function walk(k,v){var i,n;if(v&&typeof v==='object'){for(i in v){if(Object.prototype.hasOwnProperty.apply(v,[i])){n=walk(i,v[i]);if(n!==undefined){v[i]=n;}}}}
return filter(k,v);}
if(/^[\],:{}\s]*$/.test(text.replace(/\\./g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof filter==='function'?walk('',j):j;}
throw new SyntaxError('parseJSON');}};}();}
