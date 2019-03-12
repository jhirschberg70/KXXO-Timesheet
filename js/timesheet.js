let currentDate;
let dueDate;
let dueTime = '8:00 AM';
let undoData;
let name;
let hoursPerDay;
let timeStep;
let hourStep;

const DEFAULT_HOURS_PER_DAY = 8.00;
const DEFAULT_HOUR_STEP = 0.25;
const DEFAULT_TIME_STEP = 5;
const STORAGE_DLM = '\u0000';
const STATUS_TIMEOUT = 5000;
const UNDONE_TIMEOUT = 1250;

function Record(holiday, talent, vacation, sick, regular, times, activities) {
  this.holiday = holiday;
  this.talent = talent;
  this.vacation = vacation;
  this.sick = sick;
  this.regular = regular;
  this.times = times;

  // Set up totalHours
  let total = '';

  if (regular) {
    total += regular;
  }

  if (holiday) {
    if (total) { total += ' + ';}
    total += holiday + 'H';
  }

  if (talent) {
    if (total) { total += ' + ';}
    total += talent + 'T';
  }

  if (vacation) {
    if (total) { total += ' + ';}
    total += vacation + 'V';
  }

  if (sick) {
    if (total) { total += ' + ';}
    total += sick + 'S';
  }
  
  this.total = total;
  this.activities = activities;
}

function Settings(name, hoursPerDay, timeStep) {
  this.name = name;
  this.hoursPerDay = hoursPerDay;
  this.timeStep = timeStep;
}

function Undo(type, record) {
  this.type = type;
  this.record = record;
}

function saveCheck() {
  let specialHoursSelected = false;

  // Need to account for Holiday
  $('.custom-select').each(function() {
    specialHoursSelected = (specialHoursSelected || ($(this).val() !== '0'));
  });

  let numTimes = $('.times').length;
  let allTimesValid = numTimes;
  
  // Check that all times are valid.  First check that all arrive times are
  // < leave times.  Then check that return time is > previous leave time.
  for (let time = 0; time < numTimes; time++) {
    let arrive = moment(currentDate + ' ' + ($('#a-' + time).datetimepicker('date').format('HH:mm')));
    let leave  = moment(currentDate + ' ' + ($('#l-' + time).datetimepicker('date').format('HH:mm')));
    let prevLeave = moment('1970-01-01 00:00'); // Beginning of time

    if (time > 0) {
      prevLeave = moment(currentDate + ' ' + ($('#l-' + (time - 1)).datetimepicker('date').format('HH:mm')));
    }

    $('#a-' + time).parents('.time').addClass('valid').removeClass('invalid');
    $('#l-' + time).parents('.time').addClass('valid').removeClass('invalid');

    if (leave.isSameOrBefore(arrive)) {
      $('#a-' + time).parents('.time').removeClass('valid').addClass('invalid');
      $('#l-' + time).parents('.time').removeClass('valid').addClass('invalid');
      allTimesValid = false;
    }

    if (arrive.isSameOrBefore(prevLeave)) {
      $('#a-' + time).parents('.time').removeClass('valid').addClass('invalid');
      $('#l-' + (time - 1)).parents('.time').removeClass('valid').addClass('invalid');
      allTimesValid = false;
    }
  }

  // If special hours are selected or all regular/talent times are valid, it's okay to save
  if ((specialHoursSelected && (!numTimes)) ||
      (allTimesValid)) {
    $('#edit-save').prop('disabled', false);
  }
  else {
    $('#edit-save').prop('disabled', true);
  }
}

function init() {
  initSettings();
  initSelects();
  initSetDate();
  initDueDate();
  initHandlers();
}

function initSettings() {

  // Initialize to defaults
  name = '';
  hoursPerDay = DEFAULT_HOURS_PER_DAY;
  timeStep = DEFAULT_TIME_STEP;
  hourStep = DEFAULT_HOUR_STEP;
  
  let settings = JSON.parse(localStorage.getItem('settings'));

  if (settings) {
    name = settings.name;
    hoursPerDay = settings.hoursPerDay;
    timeStep = settings.timeStep;
    $('#settings-name').val(settings.name);
    $('#settings-hours-per-day').val(settings.hoursPerDay);
    $('#settings-time-step').val(settings.timeStep);
  }
}

function initHandlers() {
  $('#settings').click(settings);
  $('#add').click(addTimes);
  $('#remove').click(removeTimes);
  $('#delete').click(deleteRecord);
//  $('#edit').click(edit);
  $('#edit-save').click(save);
  $('#print').click(print);
  $('#undo').click(undo);
  $('#status-dismiss').click(statusDismiss);
  $('#edit-holiday').change(toggleHoliday);
  $('#settings-save').click(saveSettings);
}

function undo() {
  if (((undoData.type === 'edit') && (undoData.record)) || (undoData.type === 'delete')) {
    localStorage.setItem(currentDate, JSON.stringify(undoData.record));
  }
  else {
    localStorage.removeItem(currentDate);
  }

  updateStatus('Undone');
  view(currentDate);
}


/* function edit() {
 *   // First clear everything out
 *   $('.time').datetimepicker('destroy');
 *   $('.times').remove();
 *   $('.custom-select').val(0);
 *   $('#activity').val('');
 * 
 *   // Initialize undoData as if entry has never been saved
 *   undoData = new Undo('edit', null);
 *   
 *   // Check to see if an entry already exists for the current selected date
 *   let record = JSON.parse(localStorage.getItem(currentDate));
 *   
 *   if (record) {
 *     undoData.record = record;
 *     
 *     if (record.times) {
 *       let times = record.times.split(',');
 *       
 *       times.forEach(function (entry, index) {
 * 	let [arrive, leave] = entry.split('-');
 * 	addTimes();
 * 	$('#a-' + index).datetimepicker('date', arrive);
 * 	$('#l-' + index).datetimepicker('date', leave);
 *       });
 *     }
 *     $('#edit-holiday').val(record.holiday/hourStep);
 *     $('#edit-talent').val(record.talent/hourStep);
 *     $('#edit-vacation').val(record.vacation/hourStep);
 *     $('#edit-sick').val(record.sick/hourStep);
 *     $('#edit-activities').val(record.activities);
 *   }
 * 
 *   // Activate modal
 *   $('#edit-modal').modal();
 *   $('input[type="date"]').height($('input').height());
 * 
 *   // Check if it's okay to save.  This should always be true when
 *   // editing a previously saved record.
 *   saveCheck();
 * }
 * */
function view(date) {
  // Set current date
  currentDate = $('#set-date').datetimepicker('date').format('YYYY-MM-DD');

  // Check to see if current date has a record
  let record = JSON.parse(localStorage.getItem(currentDate));
  
  updateView(record);
}

function settings() {
  $('#settings-modal').modal();

  $('#import-file-picker').change(function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.files && this.files[0]) {
      let reader = new FileReader();
      reader.onload = function (e) {
	let lines = e.target.result.trim().split('\n');
	
	lines.forEach(function(line) {
	  let [key, value] = JSON.parse(line).split(STORAGE_DLM);
	  localStorage.setItem(key, value);
	});
	view(currentDate);
      }
      reader.readAsText(this.files[0]);
    }
  });

  $('#export').click(function () {
    let pairs = '';
    for (let index = 0; index < localStorage.length; index++) {
      let key = localStorage.key(index);
      let value = localStorage.getItem(key);
      
      pairs += (JSON.stringify(key + STORAGE_DLM + value)) + '\n';
    }
    download(pairs, 'localStorage.txt', 'text/plain');
  });
}

function save() {
  let regular = 0;
  let times = '';

  $('.times').each(function(index) {
    let arrive = $('#a-' + index).datetimepicker('date');
    let leave = $('#l-' + index).datetimepicker('date');
    if (times) { times += ', ';}
    times += arrive.format('LT') + '-' + leave.format('LT');
    regular += leave.diff(arrive, 'hours', true);
  });
  
  // Remove datetimepickers for regular hours
  // removeTimes();

  let record = new Record(($('#edit-holiday').val() * hourStep),
			  ($('#edit-talent').val() * hourStep),
			  ($('#edit-vacation').val() * hourStep),
			  ($('#edit-sick').val() * hourStep),
			  regular,
			  times,
			  $('#edit-activities').val());

  localStorage.setItem(currentDate, JSON.stringify(record));

  let status = '';
  
  // Generate message for modal depending on whether or not information saved
  if (localStorage.getItem(currentDate)) {
    status = 'Record saved';
  }
  else {
    status = 'Save record failed';
  }

  updateStatus(status);
  view(currentDate);
}

function addTimes() {
  let numTimes = $('.times').length;
  let arriveID = 'a-' + numTimes;
  let leaveID = 'l-' + numTimes;
  let hoursTypeID = 'ht-' + numTimes;
  let rateID = 'r-' + numTimes;
  let arriveSelector = '#' + arriveID
  let leaveSelector = '#' + leaveID;
  let hoursTypeSelector = '#' + hoursTypeID; 

  let html = '<div class=\"form-row times\">';
  html += '<div class=\"col-auto\">';
  html += '<div class=\"form-group\">';
  html += '<div class=\"d-block\">';
  html += '<label>Type</label>';
  html += '</div>';
  html += '<div class=\"custom-control custom-switch toggle\">';
  html += '<input type=\"checkbox\" class=\"custom-control-input non-holiday\" id=\"' + hoursTypeID + '\">';
  html += '<label class=\"custom-control-label toggle-label\" for=\"' + hoursTypeID + '\"><div class=\"toggle-status\">Regular</div></label>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class=\"col\">';
  html += '<div class=\"form-group time invalid\">';
  html += '<label class="time-label">Arrive</label>';
  html += '<div class=\"input-group date\" id=\"' + arriveID + '\" data-target-input=\"nearest\">';
  html += '<input type=\"text\" class=\"form-control form-control-sm datetimepicker-input\" data-target=\"' + arriveSelector + '\" data-toggle=\"datetimepicker\"/>';
  html += '<div class=\"input-group-append\" data-target=\"' + arriveSelector + '\" data-toggle=\"datetimepicker\">';
  html += '<div class=\"input-group-text\"><i class=\"fa fa-clock-o\"></i></div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class=\"col\">';
  html += '<div class=\"form-group time invalid\">';
  html += '<label class="time-label">Leave</label>';
  html += '<div class=\"input-group date\" id=\"' + leaveID + '\" data-target-input=\"nearest\">';
  html += '<input type=\"text\" class=\"form-control form-control-sm datetimepicker-input\" data-target=\"' + leaveSelector + '\" data-toggle=\"datetimepicker\"/>';
  html += '<div class=\"input-group-append\" data-target=\"' + leaveSelector + '\" data-toggle=\"datetimepicker\">';
  html += '<div class=\"input-group-text\"><i class=\"fa fa-clock-o\"></i></div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class=\"col\">';
  html += '<div class=\"form-group\">';
  html += '<label>Rate</label>';
  html += '<div class=\"input-group input-group-sm\" id=\"' + rateID + '\">';
  html += '<div class=\"input-group-prepend\">';
  html += '<div class=\"input-group-text\">$</div>';
  html += '</div>';
  html += '<input type=\"text\" class=\"form-control datetimepicker-input\">';
  html += '<div class=\"input-group-append\">';
  html += '<div class=\"input-group-text\">/hr</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  $('#edit-hours-worked').append(html);

  // Enable removal of times
  $('#remove').prop('disabled', false).removeClass('btn-hours-disabled');
  
  $(arriveSelector).datetimepicker({
    format: 'LT',
    stepping: timeStep
  });

  $(leaveSelector).datetimepicker({
    format: 'LT',
    stepping: timeStep
  });

  $(arriveSelector).datetimepicker('date', '00:00');
  $(leaveSelector).datetimepicker('date', '00:00');

  $(arriveSelector).on('change.datetimepicker', function() {
    saveCheck();
  });

  $(leaveSelector).on('change.datetimepicker', function() {
    saveCheck();
  });

  $(hoursTypeSelector).change(toggleHoursType);

  // Call saveCheck because new times will default to being invalid,
  // and submission needs to account for these newly added times
  saveCheck();
}

function removeTimes(event, instance = ':last') {
  $('.time').children('.datetimepicker-input' + instance).datetimepicker('destroy');
  $('.times' + instance).remove();
  saveCheck();

  // If there are no more times left, disable the remove button
  if (!($('.time').length)) {
    $('#remove').prop('disabled', true).addClass('btn-hours-disabled');
  }
}

function print() {
  // Determine date range of pay period and read info for that date range
  // If current date is <= 15, then pay period is 1st through 15th.
  // Otherwise, it's 16th through the end of the month.
  
  let year = moment().year();
  let month = ('0' + (moment().month() + 1)).slice(-2);
  let startDate;
  let endDate;

  if (moment().date() <= 15) {
    startDate = moment(year + '-' + month + '-01');
    endDate = moment(year + '-' + month + '-15');
  }
  else {
    startDate = moment(year + '-' + month + '-16');
    endDate = moment(year + '-' + month + '-' + moment().endOf('month').date());
  }

  let date = moment(startDate);
  let regular = 0; // Total regular hours worked in pay period
  let vacation = 0;
  let holiday = 0;
  let talent = 0;
  let sick = 0;
  let weeklyHours = 0;
  let table = '';
  let overtime = 0;
  let prevPeriodHours = 0;  // Hours worked in previous pay period that contribute to overtime for first week of this pay period

  // Determine the date of the previous Monday
  let prevPayDay = moment(startDate).day(1);

  // Collect up all the regular hours from prevMonday until startDate
  while (prevPayDay.isBefore(startDate, 'day')) {
    let record = JSON.parse(localStorage.getItem(prevPayDay.format('YYYY-MM-DD')));

    if (record) {
      prevPeriodHours += record.regular;
    }
    prevPayDay.add(1, 'day');
  }

  // Iterate over all dates in the pay period
  while (date.isSameOrBefore(endDate, 'day')) {
    
    let hoursWorked = ''; // Range of times worked
    let hours = '';       // Total regular hours for day
    let activities = '';
    let record = JSON.parse(localStorage.getItem(date.format('YYYY-MM-DD')));

    if (record) {
      if (record.regular) {
	hoursWorked = record.times;
	weeklyHours += record.regular;
	regular += record.regular;
      }

      hours = record.total;
      holiday += Number(record.holiday);
      talent += record.talent;
      vacation += Number(record.vacation);
      sick += Number(record.sick);
      activities = record.activities;
    }

    let rowClass = '';

    // If it's a weekend, shade area on timesheet
    if (((date.day()) === 0) || ((date.day()) === 6)) {
      rowClass = ' class=\"shaded\"';
    }

    // If it's a Sunday, determine overtime for the week
    if ((date.day()) === 0) {
      if (weeklyHours + prevPeriodHours > 40) {
	overtime += (weeklyHours + prevPeriodHours - 40);
	regular -= (weeklyHours + prevPeriodHours - 40);
	if (regular < 0) {regular = 0;}
      }
      weeklyHours = 0;  // Reset weekly hours on Sunday
      prevPeriodHours = 0; // Reset hours worked in previous pay period that affect first week of this period
    }

    // Determine if we need to use a smaller font for either hoursWorked or hours
    let hoursSize = '';
    let hoursWorkedSize = '';
    
    if (hours.length > 9) {
      hoursSize = ' style=\"font-size:10px;text-align:left;vertical-align:top;\"';
    }

    if (hoursWorked.length > 9) {
      hoursWorkedSize = ' style=\"font-size:10px;text-align:left;vertical-align:top;\"';
    }
    
    table += '<tr' + rowClass + '><td style=\"font-size:6mm;\">' + date.format('M/D') + '</td><td' + hoursWorkedSize +'>' + hoursWorked + '</td><td' + hoursSize + '>' + hours + '</td><td class=\"activitiesText\">' + activities + '</td></tr>';

    date.add(1, 'day');
  }

  let printWindow = window.open('print.html');

  printWindow.onload = function () {
    let name = localStorage.getItem('name');

    if (name) {
      $(printWindow.document).contents().find('#name').append('<span class="underline">' + name + '&nbsp;&nbsp;&nbsp;&nbsp;</span>');
    }

    let formattedDueDate = dueDate.format('dddd, MMMM Do') + '<br/>' + dueDate.format('h:mm A');
    let totalHoursPaid = '';

    if (Number(regular + holiday + vacation + sick)) {
      totalHoursPaid = (Number(regular + holiday + vacation + sick)).toFixed(2);
    }

    if (overtime) {
      if (totalHoursPaid) {
	totalHoursPaid += ' + ' + overtime.toFixed(2) + ' overtime';
      }
      else {
	totalHoursPaid = overtime.toFixed(2) + ' overtime';
      }
    }

    if (talent) {
      if (totalHoursPaid) {
	totalHoursPaid += ' + ' + talent;
      }
      else {
	totalHoursPaid = talent;
      }
    }
	
    $(printWindow.document).contents().find('#due-date').html(formattedDueDate);
    $(printWindow.document).contents().find('#dates').html(startDate.format('M/D/YY') + ' - ' + endDate.format('M/D/YY'));
    $(printWindow.document).contents().find('#print-table').append(table);
    $(printWindow.document).contents().find('#total-hours-paid').html(totalHoursPaid);
    $(printWindow.document).contents().find('#total-hours-worked').html(regular ? Number(regular).toFixed(2) : '');
    $(printWindow.document).contents().find('#sick').html(sick ? Number(sick).toFixed(2) : '');
    $(printWindow.document).contents().find('#vacation').html(vacation ? Number(vacation).toFixed(2) : '');
    $(printWindow.document).contents().find('#holiday').html(holiday ? Number(holiday).toFixed(2) : '');
  }
}

function initSelects() {
  // Initialize hour selects
  let chooseHours = '\<option value=\"0\"\>Choose hours\<\/option\>\n';

  $('.edit-select').append(chooseHours);
  
  for (let value = 1; value <= hoursPerDay/hourStep; value++) {
    $('.edit-select').append('\<option value=\"' + value + '\"\>' + (value * hourStep) + '\<\/option\>\n');
  }
}

function initSetDate() {
  // Update locale to have Monday be the start of the week
  moment.updateLocale("en", { week: {
    dow: 1, // First day of week is Monday
    doy: 7  // First week of year must contain 1 January (7 + 1 - 1)
  }});
  
  // Initialize datepickers
  $('#set-date').datetimepicker({
    inline: true,
    format: 'YYYY-MM-DD'
  });

  $('#set-date').on('change.datetimepicker', function() {
    view($('#set-date').datetimepicker('date'));
  });

  // If any hours setting changes, check to see if submission is
  // allowed.
  $('.custom-select').change(function() {
    saveCheck();
  });
}

function initDueDate() {
  // Determine due date
  // If end of period is Sunday, subtract two days to get due date
  // If end of period is Saturday, subtract one day to get due date

  // Assume end of period is the 15th
  let endOfPeriod = 15;
  
  if (moment().date() > 15) {
    endOfPeriod = moment().endOf('month').date();
  }

  if (moment().date(endOfPeriod).day() === 0) {
    dueDate = moment().date(endOfPeriod).subtract(2, 'days');
  }
  else if (moment().date(endOfPeriod).day() === 6) {
    dueDate = moment().date(endOfPeriod).subtract(2, 'days');
  }
  else {
    dueDate = moment().date(endOfPeriod);
  }

  // Time sheets must always be turned in by 8:00 am
  dueDate.hour(8);
  dueDate.minute(0);

  $('#due-date').prepend('Timesheet Due:  ' + dueDate.format('dddd, MMMM Do h:mm A'));
}

function deleteRecord() {
  let record = JSON.parse(localStorage.getItem(currentDate));

  undoData = new Undo('delete', record);
  localStorage.removeItem(currentDate);
  updateStatus('Record deleted');
  view(currentDate);
}

function updateStatus(msg) {
  if (msg === 'Undone') {
    $('#status-contents').fadeOut(200, function (event) {
      $('#undo').addClass('hide');
      $('#status-msg').html(msg);
      $('#status-contents').fadeIn(200);
      setTimeout( () => {$('#status-dismiss').click();}, UNDONE_TIMEOUT);
    });
  }
  else {
    $('#undo').removeClass('hide');
    $('#status-msg').html(msg);
    $('#status').fadeIn(400);
    setTimeout( () => {$('#status-dismiss').click();}, STATUS_TIMEOUT);
  }
}

function statusDismiss() {
  $('#status').fadeOut(400);
}

function updateView(record) {
  if (record) {
    $('#edit-activities').html(record.activities);
    $('#edit-holiday').html(record.holiday);
    $('#edit-vacation').html(record.vacation);
    $('#edit-sick').html(record.sick);
    $('#edit-regular').html(record.times ? record.times + ', ' + record.regular : '');
    $('#delete').removeClass('hide');
  }
  else {
    // Clear everything out
    $('#edit-activities').html('');
    $('#edit-holiday').html('-');
    $('custom-select').val(0);
    removeTimes(null, '');
  }
}

function toggleHoursType(event) {
  console.log($(this));
  if ($(this).is(':checked')) {
    $(this).siblings().children('.toggle-status').html('Talent');
  }
  else {
    $(this).siblings().children('.toggle-status').html('Regular');
  }
}

function toggleHoliday(event) {
  console.log(event);
  if ($(this).is(':checked')) {
    $('.non-holiday').prop('disabled', true);
    $('.btn-hours').addClass('btn-hours-disabled');
    removeTimes(null, '');
    $(this).siblings().children('.toggle-status').html('Yes');
  }
  else {
    $('.non-holiday').prop('disabled', false);
    $('#add').removeClass('btn-hours-disabled');
    $('#remove').prop('disabled', true);
    $(this).siblings().children('.toggle-status').html('No');
  }
}

function saveSettings() {
  name = $('#settings-name').val();
  hoursPerDay = $('#settings-hours-per-day').val();
  timeStep = $('#settings-time-step').val();
  
  let settings = new Settings(name, hoursPerDay, timeStep);
  
  localStorage.setItem('settings', JSON.stringify(settings));
}

function saveSettingsCheck() {
}

$(function() {
  init();
  view($('#set-date').datetimepicker('date'));
});
