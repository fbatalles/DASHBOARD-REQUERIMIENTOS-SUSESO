/************************************************
 * CONFIGURACIÓN
 ************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbwg5eHKRalM8xklP5SFzSwtLgDmdF8xQVgHSsrmJg4E1Sv5WnPQg1_EeUlz5mNunWG1_A/exec";


/************************************************
 * VARIABLES GLOBALES
 ************************************************/

let datosOriginales = [];
let graficoSituacion = null;
let graficoPlazos = null;


/************************************************
 * CARGAR DATOS DESDE APPS SCRIPT
 ************************************************/

function cargarDatos() {

    console.log("Iniciando carga de datos...");

    const callbackName = "dashboardCallback_" + Date.now();

    const script = document.createElement("script");

    window[callbackName] = function(resultado) {

        console.log("Respuesta recibida desde Apps Script:", resultado);

        if (!resultado || resultado.success !== true) {

            alert(
                "La API respondió con un error:\n" +
                (resultado?.error || "Error desconocido")
            );

            limpiar();

            return;
        }

        datosOriginales = resultado.datos || [];

        console.log("Total de registros cargados:", datosOriginales.length);

        inicializarFiltros();

        actualizarDashboard();

        limpiar();

    };


    function limpiar() {

        delete window[callbackName];

        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

    }


    script.src = API_URL + "?callback=" + callbackName + "&t=" + Date.now();

    script.onerror = function() {

        console.error("No se pudo conectar con Apps Script.");

        alert(
            "No fue posible conectar con Google Sheets.\n\n" +
            "Revisa la URL de Apps Script y su implementación."
        );

        limpiar();

    };


    document.body.appendChild(script);

}


/************************************************
 * INICIALIZAR FILTROS
 ************************************************/

function inicializarFiltros() {

    const filtroAnio = document.getElementById("filtroAnio");
    const filtroMes = document.getElementById("filtroMes");


    // Evitar duplicar opciones
    filtroAnio.innerHTML = '<option value="todos">Todos</option>';
    filtroMes.innerHTML = '<option value="todos">Todos</option>';


    const anios = new Set();


    datosOriginales.forEach(registro => {

        const fecha = registro["Fecha Recepción por la unidad"];

        if (!fecha) return;

        const partes = fecha.split("-");

        if (partes.length === 3) {
            anios.add(partes[0]);
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


    const meses = [
        ["01", "Enero"],
        ["02", "Febrero"],
        ["03", "Marzo"],
        ["04", "Abril"],
        ["05", "Mayo"],
        ["06", "Junio"],
        ["07", "Julio"],
        ["08", "Agosto"],
        ["09", "Septiembre"],
        ["10", "Octubre"],
        ["11", "Noviembre"],
        ["12", "Diciembre"]
    ];


    meses.forEach(mes => {

        const option = document.createElement("option");

        option.value = mes[0];
        option.textContent = mes[1];

        filtroMes.appendChild(option);

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

        const partes = fecha.split("-");

        if (partes.length !== 3) return false;

        const anio = partes[0];
        const mes = partes[1];


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


    console.log("Registros filtrados:", datosFiltrados.length);


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

        const situacion = String(
            registro["Pendiente / Cumplido"] || ""
        ).trim();

        const estado = String(
            registro["Estado"] || ""
        ).trim();


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


    const totalRespondidos = respondidos + parcialmente;

    const tasaRespuesta = total > 0
        ? (totalRespondidos / total) * 100
        : 0;


    const totalConEstado = enPlazo + fueraPlazo;

    const cumplimientoPlazo = totalConEstado > 0
        ? (enPlazo / totalConEstado) * 100
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


    if (graficoSituacion) {
        graficoSituacion.destroy();
    }


    graficoSituacion = new Chart(
        document.getElementById("graficoSituacion"),
        {
            type: "doughnut",

            data: {
                labels: [
                    "Respondidos",
                    "Respondidos parcialmente",
                    "Pendientes de respuesta"
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


    if (graficoPlazos) {
        graficoPlazos.destroy();
    }


    graficoPlazos = new Chart(
        document.getElementById("graficoPlazos"),
        {
            type: "bar",

            data: {
                labels: [
                    "Respondidos en plazo",
                    "Respondidos fuera de plazo"
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
 * ACTUALIZAR TABLA
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

document.addEventListener("DOMContentLoaded", function() {

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
