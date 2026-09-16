/****************************************************
 * DASHBOARD REQUERIMIENTOS SUSESO
 * APP.JS
 ****************************************************/


/****************************************************
 * CONFIGURACIÓN
 ****************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbzIh4iHMRz-J1OlWpIhPVe9P4xbf2P1AOpfHr6IoNLTiwgG1t1xqLjvzJwvPCg6ULSWIg/exec";


/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/

let datosOriginales = [];

let graficoSituacion = null;
let graficoPlazos = null;


/****************************************************
 * INICIO
 ****************************************************/

document.addEventListener("DOMContentLoaded", function () {

    console.log("Dashboard SUSESO iniciado");

    mostrarFechaActual();

    cargarDatos();

    document.getElementById("btnActualizar")
        .addEventListener("click", cargarDatos);

    document.getElementById("filtroAnio")
        .addEventListener("change", aplicarFiltros);

    document.getElementById("filtroMes")
        .addEventListener("change", aplicarFiltros);

});


/****************************************************
 * FECHA ACTUAL
 ****************************************************/

function mostrarFechaActual() {

    const fecha = new Date();

    const opciones = {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    };

    document.getElementById("fechaActual").textContent =
        fecha.toLocaleDateString("es-CL", opciones);

}


/****************************************************
 * CARGAR DATOS DESDE APPS SCRIPT
 ****************************************************/

async function cargarDatos() {

    try {

        console.log("Cargando datos desde Google Sheets...");

        mostrarCargando(true);


        const respuesta = await fetch(API_URL + "?t=" + Date.now());


        if (!respuesta.ok) {

            throw new Error("Error HTTP: " + respuesta.status);

        }


        const resultado = await respuesta.json();


        console.log("Respuesta recibida:", resultado);


        if (!resultado.success) {

            throw new Error(resultado.error || "Error desconocido en Apps Script");

        }


        datosOriginales = resultado.datos || [];


        console.log("Registros cargados:", datosOriginales.length);


        cargarFiltros();

        aplicarFiltros();


        mostrarCargando(false);


    } catch (error) {


        console.error("ERROR:", error);


        mostrarCargando(false);

        mostrarError(
            "No fue posible conectar con Google Sheets. Revisa la implementación de Apps Script."
        );

    }

}


/****************************************************
 * CARGAR FILTROS
 ****************************************************/

function cargarFiltros() {

    const selectAnio = document.getElementById("filtroAnio");
    const selectMes = document.getElementById("filtroMes");


    const anios = new Set();
    const meses = new Set();


    datosOriginales.forEach(registro => {

        const fecha = obtenerFecha(registro);

        if (!fecha) return;


        const partes = fecha.split("-");


        if (partes.length === 3) {

            anios.add(partes[0]);
            meses.add(partes[1]);

        }

    });


    // Reiniciar filtros

    selectAnio.innerHTML = '<option value="todos">Todos</option>';
    selectMes.innerHTML = '<option value="todos">Todos</option>';


    // AÑOS

    Array.from(anios)
        .sort((a, b) => b - a)
        .forEach(anio => {

            const option = document.createElement("option");

            option.value = anio;
            option.textContent = anio;

            selectAnio.appendChild(option);

        });


    // MESES

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


    Array.from(meses)
        .sort((a, b) => a - b)
        .forEach(mes => {

            const option = document.createElement("option");

            option.value = mes;

            option.textContent =
                nombresMeses[parseInt(mes) - 1] || mes;

            selectMes.appendChild(option);

        });

}


/****************************************************
 * OBTENER FECHA DEL REGISTRO
 ****************************************************/

function obtenerFecha(registro) {

    const camposFecha = [
        "Fecha Recepción por la unidad",
        "Fecha Recepcion por la unidad",
        "Fecha recepción",
        "Fecha Recepcion"
    ];


    for (const campo of camposFecha) {

        let valor = registro[campo];


        if (!valor) continue;


        if (typeof valor === "string") {

            if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
                return valor;
            }


            if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {

                const partes = valor.split("/");

                return partes[2] + "-" + partes[1] + "-" + partes[0];

            }

        }

    }


    return null;

}


/****************************************************
 * APLICAR FILTROS
 ****************************************************/

function aplicarFiltros() {

    if (!datosOriginales.length) return;


    const anioSeleccionado =
        document.getElementById("filtroAnio").value;

    const mesSeleccionado =
        document.getElementById("filtroMes").value;


    const datosFiltrados = datosOriginales.filter(registro => {

        const fecha = obtenerFecha(registro);


        if (!fecha) {

            return (
                anioSeleccionado === "todos" &&
                mesSeleccionado === "todos"
            );

        }


        const partes = fecha.split("-");


        const anio = partes[0];
        const mes = partes[1];


        const coincideAnio =
            anioSeleccionado === "todos" ||
            anio === anioSeleccionado;


        const coincideMes =
            mesSeleccionado === "todos" ||
            mes === mesSeleccionado;


        return coincideAnio && coincideMes;

    });


    actualizarDashboard(datosFiltrados);

}


/****************************************************
 * ACTUALIZAR DASHBOARD
 ****************************************************/

function actualizarDashboard(datos) {

    actualizarTarjetas(datos);

    actualizarGraficos(datos);

    actualizarTabla(datos);

}


/****************************************************
 * ACTUALIZAR TARJETAS
 ****************************************************/

function actualizarTarjetas(datos) {

    const total = datos.length;


    let respondidos = 0;
    let parcialmente = 0;
    let pendientes = 0;

    let enPlazo = 0;
    let fueraDePlazo = 0;


    datos.forEach(registro => {

        const estadoPrincipal =
            String(registro["Pendiente / Cumplido"] || "")
                .trim()
                .toLowerCase();


        const estado =
            String(registro["Estado"] || "")
                .trim()
                .toLowerCase();


        if (estadoPrincipal === "respondido") {

            respondidos++;

        }


        if (estadoPrincipal.includes("parcial")) {

            parcialmente++;

        }


        if (estadoPrincipal.includes("pendiente")) {

            pendientes++;

        }


        if (estado.includes("cumplido en plazo")) {

            enPlazo++;

        }


        if (estado.includes("fuera de plazo")) {

            fueraDePlazo++;

        }

    });


    const respondidosTotales =
        respondidos + parcialmente;


    const tasaRespuesta =
        total > 0
            ? (respondidosTotales / total) * 100
            : 0;


    const totalConPlazo =
        enPlazo + fueraDePlazo;


    const cumplimiento =
        totalConPlazo > 0
            ? (enPlazo / totalConPlazo) * 100
            : 0;


    document.getElementById("totalRequerimientos").textContent = total;

    document.getElementById("respondidos").textContent = respondidos;

    document.getElementById("respondidosParcialmente").textContent = parcialmente;

    document.getElementById("pendientes").textContent = pendientes;


    document.getElementById("tasaRespuesta").textContent =
        tasaRespuesta.toFixed(1) + "%";


    document.getElementById("enPlazo").textContent = enPlazo;

    document.getElementById("fueraDePlazo").textContent = fueraDePlazo;


    document.getElementById("cumplimientoPlazo").textContent =
        cumplimiento.toFixed(1) + "%";

}


/****************************************************
 * ACTUALIZAR GRÁFICOS
 ****************************************************/

function actualizarGraficos(datos) {


    let respondidos = 0;
    let parcialmente = 0;
    let pendientes = 0;

    let enPlazo = 0;
    let fueraDePlazo = 0;


    datos.forEach(registro => {

        const estadoPrincipal =
            String(registro["Pendiente / Cumplido"] || "")
                .trim()
                .toLowerCase();


        const estado =
            String(registro["Estado"] || "")
                .trim()
                .toLowerCase();


        if (estadoPrincipal === "respondido") respondidos++;

        if (estadoPrincipal.includes("parcial")) parcialmente++;

        if (estadoPrincipal.includes("pendiente")) pendientes++;


        if (estado.includes("cumplido en plazo")) enPlazo++;

        if (estado.includes("fuera de plazo")) fueraDePlazo++;

    });


    /******** GRÁFICO SITUACIÓN ********/

    const canvasSituacion =
        document.getElementById("graficoSituacion");


    if (canvasSituacion && typeof Chart !== "undefined") {


        if (graficoSituacion) {

            graficoSituacion.destroy();

        }


        graficoSituacion = new Chart(canvasSituacion, {

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
                    ],

                    backgroundColor: [
                        "#3498db",
                        "#f06292",
                        "#f39c12"
                    ]

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        position: "top"
                    }

                }

            }

        });

    }


    /******** GRÁFICO PLAZOS ********/

    const canvasPlazos =
        document.getElementById("graficoPlazos");


    if (canvasPlazos && typeof Chart !== "undefined") {


        if (graficoPlazos) {

            graficoPlazos.destroy();

        }


        graficoPlazos = new Chart(canvasPlazos, {

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
                        fueraDePlazo
                    ],

                    backgroundColor: [
                        "#27ae60",
                        "#e74c3c"
                    ]

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }

                }

            }

        });

    }

}


/****************************************************
 * ACTUALIZAR TABLA
 ****************************************************/

function actualizarTabla(datos) {

    const tbody =
        document.getElementById("tablaDatos");


    tbody.innerHTML = "";


    if (!datos.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    No existen registros para los filtros seleccionados.
                </td>
            </tr>
        `;

        return;

    }


    datos.forEach(registro => {

        const tr = document.createElement("tr");


        const id =
            registro["ID RECLAMO SUSESO"] || "";


        const fecha =
            obtenerFecha(registro) || "";


        const pendiente =
            registro["Pendiente / Cumplido"] || "";


        const estado =
            registro["Estado"] || "";


        const requerimiento =
            registro["Requerimiento"] || "";


        tr.innerHTML = `

            <td>${escaparHTML(id)}</td>

            <td>${escaparHTML(fecha)}</td>

            <td>${escaparHTML(pendiente)}</td>

            <td>${escaparHTML(estado)}</td>

            <td>${escaparHTML(requerimiento)}</td>

        `;


        tbody.appendChild(tr);

    });

}


/****************************************************
 * SEGURIDAD HTML
 ****************************************************/

function escaparHTML(valor) {

    if (valor === null || valor === undefined) return "";

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/****************************************************
 * INDICADOR DE CARGA
 ****************************************************/

function mostrarCargando(visible) {

    let indicador = document.getElementById("indicadorCarga");


    if (!indicador) {

        indicador = document.createElement("div");

        indicador.id = "indicadorCarga";


        indicador.style.position = "fixed";
        indicador.style.top = "20px";
        indicador.style.right = "20px";
        indicador.style.background = "#0d6efd";
        indicador.style.color = "#fff";
        indicador.style.padding = "12px 20px";
        indicador.style.borderRadius = "8px";
        indicador.style.zIndex = "9999";
        indicador.style.fontWeight = "bold";


        document.body.appendChild(indicador);

    }


    indicador.style.display =
        visible ? "block" : "none";


    if (visible) {

        indicador.textContent = "Cargando datos...";

    }

}


/****************************************************
 * MOSTRAR ERROR
 ****************************************************/

function mostrarError(mensaje) {

    let alerta = document.getElementById("alertaError");


    if (!alerta) {

        alerta = document.createElement("div");

        alerta.id = "alertaError";


        alerta.style.position = "fixed";
        alerta.style.top = "20px";
        alerta.style.right = "20px";
        alerta.style.background = "#dc3545";
        alerta.style.color = "#fff";
        alerta.style.padding = "15px 20px";
        alerta.style.borderRadius = "8px";
        alerta.style.zIndex = "10000";
        alerta.style.maxWidth = "400px";
        alerta.style.fontWeight = "bold";


        document.body.appendChild(alerta);

    }


    alerta.textContent = mensaje;

    alerta.style.display = "block";


    setTimeout(() => {

        alerta.style.display = "none";

    }, 10000);

}
