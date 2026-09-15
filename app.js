/************************************************
 * CONFIGURACIÓN
 ************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbwg5eHKRalM8xklP5SFzSwtLgDmdF8xQVgHSsrmJg4E1Sv5WnPQg1_EeUlz5mNunWG1_A/exec";


/************************************************
 * VARIABLES GLOBALES
 ************************************************/

let datosOriginales = [];
let graficoSituacion;
let graficoPlazos;


/************************************************
 * CARGAR DATOS
 ************************************************/

/************************************************
 * CARGAR DATOS DESDE APPS SCRIPT - JSONP
 ************************************************/

function cargarDatos() {

    const callbackName = "dashboardCallback_" + Date.now();

    window[callbackName] = function(resultado) {

        try {

            if (!resultado.success) {
                throw new Error(resultado.error);
            }

            datosOriginales = resultado.datos;

            console.log("Datos cargados correctamente:", datosOriginales.length);

            inicializarFiltros();

            actualizarDashboard();

        } catch (error) {

            console.error("Error en los datos:", error);

            alert("No fue posible procesar los datos desde Google Sheets.");

        }

        // Limpiar callback
        delete window[callbackName];

        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

    };


    const script = document.createElement("script");

    script.src = API_URL + "?callback=" + callbackName;

    script.onerror = function() {

        console.error("Error de conexión con Apps Script.");

        alert("No fue posible conectar con Google Sheets.");

        delete window[callbackName];

    };


    document.body.appendChild(script);

}

/************************************************
 * INICIALIZAR FILTROS
 ************************************************/

function inicializarFiltros() {

    const filtroAnio = document.getElementById("filtroAnio");

    const anios = new Set();

    datosOriginales.forEach(registro => {

        const fecha = registro["Fecha Recepción por la unidad"];

        if (fecha) {

            const anio = fecha.substring(0, 4);

            anios.add(anio);

        }

    });

    [...anios]
        .sort()
        .reverse()
        .forEach(anio => {

            const option = document.createElement("option");

            option.value = anio;
            option.textContent = anio;

            filtroAnio.appendChild(option);

        });

}


/************************************************
 * ACTUALIZAR DASHBOARD
 ************************************************/

function actualizarDashboard() {

    const anioSeleccionado =
        document.getElementById("filtroAnio").value;

    const mesSeleccionado =
        document.getElementById("filtroMes").value;


    const datosFiltrados = datosOriginales.filter(registro => {

        const fecha = registro["Fecha Recepción por la unidad"];

        if (!fecha) return false;

        const anio = fecha.substring(0, 4);
        const mes = fecha.substring(5, 7);

        if (
            anioSeleccionado !== "todos" &&
            anio !== anioSeleccionado
        ) {
            return false;
        }

        if (
            mesSeleccionado !== "todos" &&
            mes !== mesSeleccionado
        ) {
            return false;
        }

        return true;

    });


    calcularIndicadores(datosFiltrados);

    actualizarGraficos(datosFiltrados);

    actualizarTabla(datosFiltrados);

}


/************************************************
 * CALCULAR INDICADORES
 ************************************************/

function calcularIndicadores(datos) {

    const total = datos.length;

    let respondidos = 0;
    let parcialmente = 0;
    let pendientes = 0;

    let enPlazo = 0;
    let fueraPlazo = 0;


    datos.forEach(registro => {

        const situacion = registro["Pendiente / Cumplido"];
        const estado = registro["Estado"];


        if (situacion === "Respondido") {
            respondidos++;
        }

        if (situacion === "Respondido parcialmente") {
            parcialmente++;
        }

        if (situacion === "Pendiente de respuesta") {
            pendientes++;
        }


        if (estado === "CUMPLIDO EN PLAZO") {
            enPlazo++;
        }

        if (estado === "CUMPLIDO FUERA DE PLAZO") {
            fueraPlazo++;
        }

    });


    const tasaRespuesta = total > 0
        ? ((respondidos + parcialmente) / total) * 100
        : 0;


    const totalRespondidos = enPlazo + fueraPlazo;

    const cumplimientoPlazo = totalRespondidos > 0
        ? (enPlazo / totalRespondidos) * 100
        : 0;


    document.getElementById("totalRequerimientos").textContent = total;

    document.getElementById("respondidos").textContent = respondidos;

    document.getElementById("respondidosParcialmente").textContent = parcialmente;

    document.getElementById("pendientes").textContent = pendientes;

    document.getElementById("tasaRespuesta").textContent =
        tasaRespuesta.toFixed(1) + "%";

    document.getElementById("enPlazo").textContent = enPlazo;

    document.getElementById("fueraDePlazo").textContent = fueraPlazo;

    document.getElementById("cumplimientoPlazo").textContent =
        cumplimientoPlazo.toFixed(1) + "%";

}


/************************************************
 * GRÁFICOS
 ************************************************/

function actualizarGraficos(datos) {

    const respondidos = datos.filter(
        r => r["Pendiente / Cumplido"] === "Respondido"
    ).length;

    const parcialmente = datos.filter(
        r => r["Pendiente / Cumplido"] === "Respondido parcialmente"
    ).length;

    const pendientes = datos.filter(
        r => r["Pendiente / Cumplido"] === "Pendiente de respuesta"
    ).length;

    const enPlazo = datos.filter(
        r => r["Estado"] === "CUMPLIDO EN PLAZO"
    ).length;

    const fueraPlazo = datos.filter(
        r => r["Estado"] === "CUMPLIDO FUERA DE PLAZO"
    ).length;


    if (graficoSituacion) graficoSituacion.destroy();

    graficoSituacion = new Chart(
        document.getElementById("graficoSituacion"),
        {
            type: "doughnut",

            data: {
                labels: [
                    "Respondidos",
                    "Respondidos parcialmente",
                    "Pendientes"
                ],

                datasets: [{
                    data: [
                        respondidos,
                        parcialmente,
                        pendientes
                    ]
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );


    if (graficoPlazos) graficoPlazos.destroy();

    graficoPlazos = new Chart(
        document.getElementById("graficoPlazos"),
        {
            type: "bar",

            data: {
                labels: [
                    "En plazo",
                    "Fuera de plazo"
                ],

                datasets: [{
                    label: "Cantidad",
                    data: [
                        enPlazo,
                        fueraPlazo
                    ]
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );

}


/************************************************
 * TABLA
 ************************************************/

function actualizarTabla(datos) {

    const tabla = document.getElementById("tablaDatos");

    tabla.innerHTML = "";


    datos.forEach(registro => {

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${registro["ID RECLAMO SUSESO"] || ""}</td>
            <td>${registro["Fecha Recepción por la unidad"] || ""}</td>
            <td>${registro["Pendiente / Cumplido"] || ""}</td>
            <td>${registro["Estado"] || ""}</td>
            <td>${registro["Requerimiento"] || ""}</td>
        `;

        tabla.appendChild(fila);

    });

}


/************************************************
 * EVENTOS
 ************************************************/

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("fechaActual").textContent =
        new Date().toLocaleDateString("es-CL");

    cargarDatos();


    document.getElementById("filtroAnio")
        .addEventListener("change", actualizarDashboard);

    document.getElementById("filtroMes")
        .addEventListener("change", actualizarDashboard);

    document.getElementById("btnActualizar")
        .addEventListener("click", cargarDatos);

});
