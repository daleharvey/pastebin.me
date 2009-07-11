Paste = function() {

  var id = document.location.pathname.split("/")[1];

  this.state = ( id !== "" )
    ? {NEW_POST:false, VIEW:"HTML", _id:id}
    : {NEW_POST:true,  VIEW:"CODE"};

  this.dom = {
    textarea: $("#code"),
    iframe:   $("#paste"),
    title:    $("#title"),
    viewcode: $("#viewcode"),
    form:     $("#form"),
    lines:    $("#lines")
  };

  this.load_recent_posts();
  this.add_events();

  if( !this.state.NEW_POST ) {
    this.retrieve_post(this.state_id);
  } else {
    this.dom.title.val("[Enter Title Here]");
    this.dom.textarea.show();
    this.dom.lines.show();
    $("#title, #templates, #save").show();
  }

  this.window_resize();
  this.fill_lines();
};

Paste.prototype.save_paste = function()
{
  var that = this, d = new Date();

  var paste = {
    date:  d.getTime()  + (d.getTimezoneOffset() * 60000),
    paste: this.dom.textarea.val(),
    title: this.dom.title.val()
  };

  $("#save").attr("disabled", "disabled").val("Saving...");

  $.ajax({
    "url":"/pastebin/",
    "type":"POST",
    "data":JSON.stringify(paste),
    "dataType": "json",
    "success":function(data) {
      document.location.href= "/"+data.id;
    },
    "error":function(XMLHttpRequest, textStatus, errorThrown) {
      var data = JSON.parse(XMLHttpRequest.responseText);
      that.show_error(data.reason);
    }
  });
};

Paste.prototype.show_error = function(reason)
{
  $("#save").removeAttr("disabled").val("Save Your Paste");
  $("#error").html("<strong>Error!</strong><br />"+reason).show();
  setTimeout(function() {
    $("#error").fadeOut();
  }, 2000);
};

Paste.prototype.view_code = function()
{
  this.dom.textarea.show();
  this.dom.lines.show();
  this.dom.iframe.hide();
  this.dom.viewcode.hide();

  var that = this;
  setTimeout( function() {
    that.dom.textarea[0].focus();
  });
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

  this.dom.viewcode.bind('mousedown', function() {
    that.view_code();
  });

  this.dom.title.bind('focus', function() {
    if( $(this).val() == "[Enter Title Here]" ) {
      $(this).val("");
    }
  });
};

Paste.prototype.window_resize = function()
{
  $("#code, #paste, #lines").height($(window).height() - 116);
};

Paste.prototype.load_template = function(tpl)
{
  var that = this;
  var url  = "/pastebin/_design/pastebin.me/tpl/";

  $.get(url+tpl+".tpl", {}, function(data) {

    that.dom.textarea.val(data);
    if( that.state !== "CODE" ) {
      that.view_code();
    }

  }, "text");
};


Paste.prototype.load_recent_posts = function()
{
  var opts = { reduce: false, descending: true, limit:13 };
  var url  = "/pastebin/_design/pastebin.me/_view/recent";

  $.get(url, opts, function(data) {
    $.each(data.rows, function() {
      var ndate = prettyDate(this.key - ((new Date()).getTimezoneOffset() * 60000)) || "the future!";
      var date = ' <span class="subtle">('+ ndate +')</span>';
      var link = '<li><a href="/' + this.value.id+'">'
        +this.value.title+'</a>'+date+'</li>';
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

Paste.prototype.retrieve_post = function( id )
{
  var show = "/pastebin/_design/pastebin.me/_show/raw/";

  var that = this;

  $.ajax({
    "url":"/pastebin/"+this.state._id,
    "dataType": "json",
    "success": function(data) {
      that.dom.title.val( data.title );
      that.dom.textarea.text( data.paste );

      if(data.paste.match(/<html/)) {
        that.dom.iframe.attr("src", show+that.state._id);
        that.dom.iframe.show();
        that.dom.viewcode.show();
      } else {
        that.dom.textarea.show();
        that.dom.lines.show();
      }
      $("#title, #templates, #save").show();
    },
    "error" : function(data) {
      that.view_code();
      that.dom.title.val("[Enter Title Here]");
      $("#title, #templates, #save").show();
    }
  });
};

Paste.parse_query = function(url) {
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

