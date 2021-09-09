

function save() {
  var oldage = document.getElementById("oldage");
  localStorage["old_age_mins"] = oldage.value;
  var archivemode = document.getElementById("archivemode");
  localStorage["archive_mode"] = archivemode.checked;
  chrome.extension.getBackgroundPage().loadConfig();
}

function restore_options() {
  var old_age_mins = localStorage["old_age_mins"];
  if (!old_age_mins) {
    old_age_mins =  60*4;
  }

  var input = document.getElementById("oldage");
  input.value = old_age_mins;
}


document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#save').addEventListener('click',  save);

  restore_options();
});
