const connToken = JPDB_CONFIG.connectionToken;
const jpdbBaseURL = "https://api.login2explore.com:5577";
const jpdbIML = "/api/iml";
const jpdbIRL = "/api/irl";
const dbName = "EMP-DB";
const relationName = "EmpData";

const fields = {
  id: document.getElementById("empId"),
  name: document.getElementById("empName"),
  salary: document.getElementById("empSalary"),
  hra: document.getElementById("empHra"),
  da: document.getElementById("empDa"),
  deduction: document.getElementById("empDeduction")
};

const saveBtn = document.getElementById("saveBtn");
const changeBtn = document.getElementById("changeBtn");
const resetBtn = document.getElementById("resetBtn");
const statusMessage = document.getElementById("statusMessage");
const netPay = document.getElementById("netPay");

let currentRecordNumber = null;
let formMode = "initial";
let lookupInProgress = false;
let lookupTimer = null;

function showStatus(message, type = "info") {
  const icons = {
    info: "bi-info-circle",
    success: "bi-check-circle-fill",
    error: "bi-exclamation-circle-fill",
    loading: "bi-arrow-repeat"
  };
  statusMessage.className = `status-message ${type}`;
  statusMessage.innerHTML = `<i class="bi ${icons[type]}"></i><span>${message}</span>`;
}

function setButtons({ save = false, change = false, reset = false } = {}) {
  saveBtn.disabled = !save;
  changeBtn.disabled = !change;
  resetBtn.disabled = !reset;
}

function setEditable(enabled) {
  Object.values(fields).forEach(field => {
    if (field.id !== "empId") field.disabled = !enabled;
  });
}

function clearEmployeeFields() {
  fields.name.value = "";
  fields.salary.value = "";
  fields.hra.value = "";
  fields.da.value = "";
  fields.deduction.value = "";
  updateNetPay();
}

function resetForm() {
  clearTimeout(lookupTimer);
  lookupInProgress = false;
  fields.id.disabled = false;
  fields.id.value = "";
  clearEmployeeFields();
  setEditable(false);
  setButtons();
  currentRecordNumber = null;
  formMode = "initial";
  showStatus("Start by entering an Employee ID.");
  fields.id.focus();
}

function updateNetPay() {
  const salary = Number(fields.salary.value) || 0;
  const hra = Number(fields.hra.value) || 0;
  const da = Number(fields.da.value) || 0;
  const deduction = Number(fields.deduction.value) || 0;
  const total = salary + hra + da - deduction;
  netPay.textContent = `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseJPDBData(data) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

function executeJPDBRequest(request, endpoint) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: jpdbBaseURL + endpoint,
      type: "POST",
      data: request,
      dataType: "json",
      success: response => resolve(response),
      error: xhr => {
        let message = "Unable to communicate with JsonPowerDB.";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          message = xhr.responseJSON.message;
        } else if (xhr.responseText) {
          try {
            message = JSON.parse(xhr.responseText).message || message;
          } catch {}
        }
        reject(new Error(message));
      }
    });
  });
}

function getEmployeeKeyJSON() {
  return JSON.stringify({ id: fields.id.value.trim() });
}

async function getEmployee() {
  const id = fields.id.value.trim();
  if (!id || lookupInProgress) return;

 if (connToken === "PASTE_YOUR_CONNECTION_TOKEN_HERE" || !connToken.trim()) {
    showStatus("Add your JsonPowerDB connection token in script.js before using the form.", "error");
    return;
  }

  lookupInProgress = true;
  fields.id.disabled = true;
  showStatus("Checking employee ID in the database…", "loading");

  try {
    const request = createGET_BY_KEYRequest(connToken, dbName, relationName, getEmployeeKeyJSON(), true, true);
    const response = await executeJPDBRequest(request, jpdbIRL);

    if (response.status === 200) {
      const result = parseJPDBData(response.data);
      const record = result.record || result;
      currentRecordNumber = result.rec_no ?? result.record_number ?? result["record number"] ?? null;

      fields.name.value = record.name ?? "";
      fields.salary.value = record.salary ?? "";
      fields.hra.value = record.hra ?? "";
      fields.da.value = record.da ?? "";
      fields.deduction.value = record.deduction ?? "";

      if (currentRecordNumber === null) {
        throw new Error("The employee was found, but the record number was not returned. Please verify the database response.");
      }

      fields.id.disabled = true;
      setEditable(true);
      setButtons({ change: true, reset: true });
      formMode = "existing";
      updateNetPay();
      showStatus("Employee record found. You can now update the employee details.", "success");
      fields.name.focus();
    } else if (response.status === 400) {
      fields.id.disabled = false;
      setEditable(true);
      setButtons({ save: true, reset: true });
      formMode = "new";
      showStatus("New employee ID. Enter the employee details and save the record.", "success");
      fields.name.focus();
    } else {
      throw new Error(response.message || "The database could not complete the lookup.");
    }
  } catch (error) {
    fields.id.disabled = false;
    setEditable(false);
    setButtons();
    formMode = "initial";
    showStatus(error.message, "error");
    fields.id.focus();
  } finally {
    lookupInProgress = false;
  }
}

function validateAndGetFormData() {
  const data = {};
  for (const [key, field] of Object.entries(fields)) {
    const value = field.value.trim();
    if (!value) {
      showStatus(`${field.labels[0].textContent.replace("*", "").trim()} is required.`, "error");
      field.focus();
      return null;
    }
    if (["salary", "hra", "da", "deduction"].includes(key)) {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0) {
        showStatus(`${field.labels[0].textContent.replace("*", "").trim()} must be a valid non-negative amount.`, "error");
        field.focus();
        return null;
      }
      data[key] = amount;
    } else {
      data[key] = value;
    }
  }
  return data;
}

async function saveEmployee() {
  if (formMode !== "new") return;
  const data = validateAndGetFormData();
  if (!data) return;

  saveBtn.disabled = true;
  resetBtn.disabled = true;
  showStatus("Saving employee record…", "loading");

  try {
    const request = createPUTRequest(connToken, JSON.stringify(data), dbName, relationName);
    const response = await executeJPDBRequest(request, jpdbIML);
    if (response.status === 200) {
      showStatus("Employee record saved successfully to JsonPowerDB.", "success");
      resetForm();
      showStatus("Employee saved successfully. Ready for the next record.", "success");
    } else {
      throw new Error(response.message || "Unable to save the employee record.");
    }
  } catch (error) {
    showStatus(error.message, "error");
    setButtons({ save: true, reset: true });
  }
}

async function changeEmployee() {
  if (formMode !== "existing" || currentRecordNumber === null) return;
  const data = validateAndGetFormData();
  if (!data) return;

  changeBtn.disabled = true;
  resetBtn.disabled = true;
  showStatus("Updating employee record…", "loading");

  try {
    const updateData = {
      name: data.name,
      salary: data.salary,
      hra: data.hra,
      da: data.da,
      deduction: data.deduction
    };
    const request = createUPDATERecordRequest(connToken, JSON.stringify(updateData), dbName, relationName, currentRecordNumber);
    const response = await executeJPDBRequest(request, jpdbIML);
    if (response.status === 200) {
      resetForm();
      showStatus("Employee details updated successfully.", "success");
    } else {
      throw new Error(response.message || "Unable to update the employee record.");
    }
  } catch (error) {
    showStatus(error.message, "error");
    setButtons({ change: true, reset: true });
  }
}

fields.id.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === "Tab") {
    if (event.key === "Enter") {
      event.preventDefault();
      getEmployee();
    }
  }
});

fields.id.addEventListener("blur", () => {
  if (fields.id.value.trim() && formMode === "initial") {
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(getEmployee, 120);
  }
});

Object.values(fields).forEach(field => {
  if (field.id !== "empId") {
    field.addEventListener("input", updateNetPay);
  }
});

saveBtn.addEventListener("click", saveEmployee);
changeBtn.addEventListener("click", changeEmployee);
resetBtn.addEventListener("click", resetForm);

document.getElementById("employeeForm").addEventListener("submit", event => event.preventDefault());

window.addEventListener("DOMContentLoaded", () => {
  resetForm();
});
