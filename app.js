/****************************************************
 * CONFIGURACIÓN
 ****************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbziYoHO4z9Yr13fq53nliVkObaevsyUz0IuGITA9a-zynZvE2t3u1FMDKC8HmePlGCD/exec";


/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/

let datosOriginales = [];
let graficoSituacion;
let graficoPlazos;


/****************************************************
 * INICIO
 ****************************************************/

document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("fechaActual").textContent =
        new Date().toLocaleDateString("es-CL");

    cargarDatos();

    document.getElementById("btnActualizar").addEventListener("click", function () {
        aplicarFiltros();
    });

    document.getElementById("filtroAnio").addEventListener("change", aplicarFiltros);
    document.getElementById("filtroMes").addEventListener("change", aplicarFiltros);

});


/****************************************************
 * CARGAR DATOS DESDE APPS SCRIPT
 * USANDO JSONP PARA EVITAR CORS
 ****************************************************/

function cargarDatos() {

    const callbackName = "recibirDatos_" + Date.now();

    window[callbackName] = function (respuesta) {

        try {

            if (!respuesta.success) {
                mostrarError("Apps Script respondió con error.");
                return;
            }

            datosOriginales = respuesta.datos || [];

            console.log("Datos recibidos:", datosOriginales.length);

            cargarFiltros(datosOriginales);

            aplicarFiltros();

            eliminarScript();

        } catch (error) {

            console.error("Error procesando datos:", error);

            mostrarError("Error procesando los datos recibidos.");

        }

    };

    const script = document.createElement("script");

    script.src = API_URL + "?callback=" + callbackName;

    script.id = "scriptDatosDashboard";

    script.onerror = function () {

        mostrarError(
            "No fue posible conectar con Google Sheets. Verifica la implementación de Apps Script."
        );

        eliminarScript();

    };

    document.body.appendChild(script);


    function eliminarScript() {

        const elemento = document.getElementById("scriptDatosDashboard");

        if (elemento) {
            elemento.remove();
        }

        delete window[callbackName];

    }

}


/****************************************************
 * CARGAR FILTROS
 ****************************************************/

function cargarFiltros(datos) {

    const selectAnio = document.getElementById("filtroAnio");
    const selectMes = document.getElementById("filtroMes");

    const anios = new Set();
    const meses = new Set();

    datos.forEach(registro => {

        const fecha = registro["Fecha Recepción por la unidad"];

        if (!fecha) return;

        const partes = fecha.split("-");

        if (partes.length !== 3) return;

        const anio = partes[0];
        const mes = partes[1];

        anios.add(anio);
        meses.add(mes);

    });

    selectAnio.innerHTML = '<option value="todos">Todos</option>';

    [...anios]
        .sort()
        .forEach(anio => {

            const option = document.createElement("option");

            option.value = anio;
            option.textContent = anio;

            selectAnio.appendChild(option);

        });


    selectMes.innerHTML = '<option value="todos">Todos</option>';

    const nombresMeses = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre"
    ];

    [...meses]
        .sort()
        .forEach(mes => {

            const option = document.createElement("option");

            option.value = mes;
            option.textContent = nombresMeses[parseInt(mes) - 1] || mes;

            selectMes.appendChild(option);

        });

}


/****************************************************
 * APLICAR FILTROS
 ****************************************************/

function aplicarFiltros() {

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


        const cumpleAnio =
            anioSeleccionado === "todos" ||
            anio === anioSeleccionado;

        const cumpleMes =
            mesSeleccionado === "todos" ||
            mes === mesSeleccionado;


        return cumpleAnio && cumpleMes;

    });


    actualizarDashboard(datosFiltrados);

}


/****************************************************
 * ACTUALIZAR DASHBOARD
 ****************************************************/

function actualizarDashboard(datos) {

    const total = datos.length;


    const respondidos = datos.filter(registro =>
        normalizar(registro["Pendiente / Cumplido"]) === "respondido"
    ).length;


    const parcialmente = datos.filter(registro =>
        normalizar(registro["Pendiente / Cumplido"]) === "respondido parcialmente"
    ).length;


    const pendientes = datos.filter(registro =>
        normalizar(registro["Pendiente / Cumplido"]) === "pendiente de respuesta"
    ).length;


    const enPlazo = datos.filter(registro =>
        normalizar(registro["Estado"]) === "cumplido en plazo"
    ).length;


    const fueraDePlazo = datos.filter(registro =>
        normalizar(registro["Estado"]) === "cumplido fuera de plazo"
    ).length;


    const tasaRespuesta =
        total > 0
            ? ((respondidos + parcialmente) / total * 100).toFixed(1)
            : 0;


    const cumplimientoPlazo =
        (enPlazo + fueraDePlazo) > 0
            ? (enPlazo / (enPlazo + fueraDePlazo) * 100).toFixed(1)
            : 0;


    document.getElementById("totalRequerimientos").textContent = total;

    document.getElementById("respondidos").textContent = respondidos;

    document.getElementById("respondidosParcialmente").textContent = parcialmente;

    document.getElementById("pendientes").textContent = pendientes;

    document.getElementById("tasaRespuesta").textContent = tasaRespuesta + "%";

    document.getElementById("enPlazo").textContent = enPlazo;

    document.getElementById("fueraDePlazo").textContent = fueraDePlazo;

    document.getElementById("cumplimientoPlazo").textContent =
        cumplimientoPlazo + "%";


    actualizarGraficos(
        respondidos,
        parcialmente,
        pendientes,
        enPlazo,
        fueraDePlazo
    );


    actualizarTabla(datos);

}


/****************************************************
 * NORMALIZAR TEXTO
 ****************************************************/

function normalizar(texto) {

    if (texto === null || texto === undefined) return "";

    return texto
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


/****************************************************
 * GRÁFICOS
 ****************************************************/

function actualizarGraficos(
    respondidos,
    parcialmente,
    pendientes,
    enPlazo,
    fueraDePlazo
) {


    if (graficoSituacion) {
        graficoSituacion.destroy();
    }

    if (graficoPlazos) {
        graficoPlazos.destroy();
    }


    const ctxSituacion =
        document.getElementById("graficoSituacion");


    graficoSituacion = new Chart(ctxSituacion, {

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

            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }

        }

    });


    const ctxPlazos =
        document.getElementById("graficoPlazos");


    graficoPlazos = new Chart(ctxPlazos, {

        type: "bar",

        data: {

            labels: [
                "Cumplido en plazo",
                "Cumplido fuera de plazo"
            ],

            datasets: [{

                label: "Cantidad",

                data: [
                    enPlazo,
                    fueraDePlazo
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

            },

            plugins: {

                legend: {
                    display: false
                }

            }

        }

    });

}


/****************************************************
 * TABLA
 ****************************************************/

function actualizarTabla(datos) {

    const tbody = document.getElementById("tablaDatos");

    tbody.innerHTML = "";


    datos.forEach(registro => {

        const fila = document.createElement("tr");

        fila.innerHTML = `

            <td>${registro["ID RECLAMO SUSESO"] || ""}</td>

            <td>${registro["Fecha Recepción por la unidad"] || ""}</td>

            <td>${registro["Pendiente / Cumplido"] || ""}</td>

            <td>${registro["Estado"] || ""}</td>

            <td>${registro["Requerimiento"] || ""}</td>

        `;

        tbody.appendChild(fila);

    });

}


/****************************************************
 * MOSTRAR ERROR
 ****************************************************/

function mostrarError(mensaje) {

    console.error(mensaje);

    alert(mensaje);

}
