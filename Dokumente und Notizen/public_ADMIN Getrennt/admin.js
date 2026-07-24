const loginPanel=document.getElementById("loginPanel");
const adminArea=document.getElementById("adminArea");
const adminKeyInput=document.getElementById("adminKey");
const loginButton=document.getElementById("loginButton");
const logoutButton=document.getElementById("logoutButton");
const filterButton=document.getElementById("filterButton");
const resetButton=document.getElementById("resetButton");
const dateFromInput=document.getElementById("dateFrom");
const dateToInput=document.getElementById("dateTo");
const apartmentFilter=document.getElementById("apartmentFilter");
const deviceFilter=document.getElementById("deviceFilter");
const bookingTableBody=document.getElementById("bookingTableBody");
const bookingCount=document.getElementById("bookingCount");
const messageBox=document.getElementById("message");

let adminKey="";
let allBookings=[];
let messageTimer;

function showMessage(text,type="success"){
  clearTimeout(messageTimer);
  messageBox.textContent=text;
  messageBox.className=`message show ${type}`;
  messageTimer=setTimeout(()=>{messageBox.className="message";messageBox.textContent="";},5000);
}

function getDateValue(value){return value?String(value).split("T")[0]:"";}
function formatDate(value){const dateValue=getDateValue(value);if(!dateValue)return "";const [year,month,day]=dateValue.split("-");return `${day}.${month}.${year}`;}
function formatTime(value){return value?String(value).slice(0,5):"";}
function getDeviceClass(name){switch(name){case"SUP 1":return"device-sup-1";case"SUP 2":return"device-sup-2";case"Ruderboot":return"device-ruderboot";case"Paddelboot":return"device-paddelboot";default:return"";}}
function createOption(value,text){const option=document.createElement("option");option.value=value;option.textContent=text;return option;}

function fillFilterOptions(){
  const selectedApartment=apartmentFilter.value;
  const selectedDevice=deviceFilter.value;
  const apartments=[...new Set(allBookings.map(b=>b.appartement).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"de",{numeric:true}));
  const devices=[...new Set(allBookings.map(b=>b.sup).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"de"));
  apartmentFilter.innerHTML="";apartmentFilter.appendChild(createOption("","Alle Appartements"));apartments.forEach(v=>apartmentFilter.appendChild(createOption(v,v)));
  deviceFilter.innerHTML="";deviceFilter.appendChild(createOption("","Alle Geräte"));devices.forEach(v=>deviceFilter.appendChild(createOption(v,v)));
  apartmentFilter.value=apartments.includes(selectedApartment)?selectedApartment:"";
  deviceFilter.value=devices.includes(selectedDevice)?selectedDevice:"";
}

function getFilteredBookings(){
  const dateFrom=dateFromInput.value,dateTo=dateToInput.value,selectedApartment=apartmentFilter.value,selectedDevice=deviceFilter.value;
  return allBookings.filter(b=>{const d=getDateValue(b.datum);if(dateFrom&&d<dateFrom)return false;if(dateTo&&d>dateTo)return false;if(selectedApartment&&b.appartement!==selectedApartment)return false;if(selectedDevice&&b.sup!==selectedDevice)return false;return true;}).sort((a,b)=>{const d=getDateValue(a.datum).localeCompare(getDateValue(b.datum));return d!==0?d:String(a.von).localeCompare(String(b.von));});
}

function updateBookingCount(count){bookingCount.textContent=count===1?"1 Buchung":`${count} Buchungen`;}

function renderBookings(bookings){
  bookingTableBody.innerHTML="";updateBookingCount(bookings.length);
  if(bookings.length===0){const row=document.createElement("tr");row.innerHTML='<td colspan="5" class="empty-state">Für diese Auswahl wurden keine Buchungen gefunden.</td>';bookingTableBody.appendChild(row);return;}
  bookings.forEach(booking=>{
    const row=document.createElement("tr");
    const dateCell=document.createElement("td");dateCell.textContent=formatDate(booking.datum);
    const timeCell=document.createElement("td");timeCell.textContent=`${formatTime(booking.von)}–${formatTime(booking.bis)} Uhr`;
    const apartmentCell=document.createElement("td");apartmentCell.textContent=booking.appartement||"–";
    const deviceCell=document.createElement("td");const badge=document.createElement("span");badge.className=`device-badge ${getDeviceClass(booking.sup)}`;badge.textContent=booking.sup||"–";deviceCell.appendChild(badge);
    const actionCell=document.createElement("td");const button=document.createElement("button");button.type="button";button.className="delete-button";button.textContent="Löschen";button.addEventListener("click",()=>deleteBooking(booking));actionCell.appendChild(button);
    row.append(dateCell,timeCell,apartmentCell,deviceCell,actionCell);bookingTableBody.appendChild(row);
  });
}

function applyFilters(){if(dateFromInput.value&&dateToInput.value&&dateFromInput.value>dateToInput.value){showMessage("Das Von-Datum darf nicht nach dem Bis-Datum liegen.","error");return;}renderBookings(getFilteredBookings());}
function resetFilters(){dateFromInput.value="";dateToInput.value="";apartmentFilter.value="";deviceFilter.value="";renderBookings(allBookings);}

async function loadBookings(){
  bookingTableBody.innerHTML='<tr><td colspan="5" class="loading">Buchungen werden geladen …</td></tr>';
  const response=await fetch("/api/bookings");const result=await response.json().catch(()=>[]);
  if(!response.ok)throw new Error(result.message||"Die Buchungen konnten nicht geladen werden.");
  allBookings=Array.isArray(result)?result:[];fillFilterOptions();renderBookings(getFilteredBookings());
}

async function login(){
  const enteredKey=adminKeyInput.value.trim();if(!enteredKey){showMessage("Bitte gib den Admin-Schlüssel ein.","error");return;}
  adminKey=enteredKey;loginButton.disabled=true;loginButton.textContent="Anmeldung läuft …";
  try{
    const response=await fetch("/api/admin/check",{headers:{"X-ADMIN-KEY":adminKey}});const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||"Der Admin-Schlüssel ist ungültig.");
    await loadBookings();loginPanel.classList.add("hidden");adminArea.classList.remove("hidden");
  }catch(error){console.error(error);showMessage(error.message||"Der Adminbereich konnte nicht geladen werden.","error");adminKey="";}
  finally{loginButton.disabled=false;loginButton.textContent="Anmelden";}
}

function logout(){adminKey="";adminKeyInput.value="";adminArea.classList.add("hidden");loginPanel.classList.remove("hidden");allBookings=[];bookingTableBody.innerHTML="";updateBookingCount(0);}

async function deleteBooking(booking){
  const text=`${booking.sup}\n${booking.appartement}\n${formatDate(booking.datum)}\n${formatTime(booking.von)}–${formatTime(booking.bis)} Uhr\n\nDiese Buchung wirklich löschen?`;
  if(!window.confirm(text))return;
  try{
    const response=await fetch(`/api/admin/delete/${booking.id}`,{method:"DELETE",headers:{"X-ADMIN-KEY":adminKey}});const result=await response.json().catch(()=>({}));
    if(!response.ok){if(response.status===401){logout();throw new Error("Der Admin-Schlüssel ist ungültig.");}throw new Error(result.error||result.message||"Die Buchung konnte nicht gelöscht werden.");}
    await loadBookings();showMessage(result.message||"Die Buchung wurde gelöscht.","success");
  }catch(error){console.error(error);showMessage(error.message||"Beim Löschen ist ein Fehler aufgetreten.","error");}
}

loginButton.addEventListener("click",login);
adminKeyInput.addEventListener("keydown",event=>{if(event.key==="Enter")login();});
filterButton.addEventListener("click",applyFilters);
resetButton.addEventListener("click",resetFilters);
logoutButton.addEventListener("click",logout);
dateFromInput.addEventListener("change",applyFilters);
dateToInput.addEventListener("change",applyFilters);
apartmentFilter.addEventListener("change",applyFilters);
deviceFilter.addEventListener("change",applyFilters);
