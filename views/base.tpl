<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>{{title or 'Rackspace Monitoring'}}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="">
    <meta name="author" content="">

%if debug:
    <link href="/static/css/bootstrap.css" rel="stylesheet">
%else:
    <link href="/static/css/bootstrap.min.css" rel="stylesheet">
%end
    <style>
      body {
        padding-top: 60px;
      }
    </style>
%if debug:
    <link href="/static/css/bootstrap-responsive.css" rel="stylesheet">
%else:
    <link href="/static/css/bootstrap-responsive.min.css" rel="stylesheet">
%end

%try:
  %styles()
%except NameError:
  %pass
%end

%try:
  %links()
%except NameError:
  %pass
%end

%try:
  %scripts()
%except NameError:
  %pass
%end

%if debug:
    <script src="/static/js/jquery.js"></script>
    <script src="/static/js/bootstrap.js"></script>
%else:
    <script src="/static/js/jquery.min.js"></script>
    <script src="/static/js/bootstrap.min.js"></script>
%end

  </head>

  <body>

    <div class="navbar navbar-inverse navbar-fixed-top">
      <div class="navbar-inner">
        <div class="container">
          <a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </a>
          <a class="brand" href="/">Rackspace Monitoring</a>
          <div class="nav-collapse collapse">
	    <ul class="nav pull-right">
%if session:
	      <li><a href="/" class="disabled">{{session['username']}}</a></li>
	      <li><a href="/logout">(Logout)</a></li>
%else:
	      <li><a href="/login">(Login)</a></li>
%end
	    </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
%include
    </div>

  </body>
</html>
