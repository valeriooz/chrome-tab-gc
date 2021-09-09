

function save() {
  var oldage = document.getElementById("oldage");
  localStorage["old_age_mins"] = oldage.value;
  var archivemode = document.getElementById("archivemode");
  localStorage["archive_mode"] = archivemode.checked;
  chrome.extension.getBackgroundPage().loadConfig();
}

function restore_options() {
  var old_age_mins = localStorage["old_age_mins"];
  var archive_mode_value = localStorage["archive_mode"];
  if (!old_age_mins) {
    old_age_mins = 60 * 4;
  }

  var oldage = document.getElementById("oldage");
  oldage.value = old_age_mins;
  var archivemode = document.getElementById("archivemode");
  archivemode.checked = archivemode;
}


document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#save').addEventListener('click', save);

  restore_options();
});
