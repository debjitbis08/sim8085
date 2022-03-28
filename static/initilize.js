var editor = CodeMirror.fromTextArea(document.getElementById("coding-area__editor"), {
  lineNumbers: true
});

editor.on('change', function (instance, change) {
  app.ports.code.send(instance.getValue());
})
