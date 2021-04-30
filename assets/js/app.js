
function showSpinner() {
  document.getElementById('uploadForm').style.display = 'none';
  document.getElementById('spinner').style.display = 'block';
  setTimeout(function () {
    document.getElementById('uploadForm').submit();
  }, 7000)
}
