/****************************************************
 * DASHBOARD REQUERIMIENTOS SUSESO
 * APP.JS - VERSION DEFINITIVA
 ****************************************************/


/****************************************************
 * CONFIGURACIÓN
 ****************************************************/

const API_URL =
"https://script.google.com/macros/s/AKfycbynk65zqbigtr0gkrqFm1eY1kNEiXGr25WCncrmTK6i-SXE8s7UkpiWQqWhFV5MF3VnQ/exec";


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

    console.log("Iniciando Dashboard SUSESO...");

    mostrarFechaActual();

    cargarDatos();

    document.getElementById("btnActualizar").addEventListener("click", function () {

        cargarDatos();

    });

    document.getElementById("filtroAnio").addEventListener("change", aplicarFiltros);

    document.getElementById("filtroMes").addEventListener("change", aplicarFiltros);

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

    const fechaTexto = fecha.toLocaleDateString("es-CL", opciones);

    const elemento = document.getElementById("fechaActual");

    if (elemento) {
        elemento.textContent = fechaTexto;
    }

}


/****************************************************
 * CARGAR DATOS DESDE GOOGLE APPS SCRIPT
 ****************************************************/

function cargarDatos() {

    console.log("Iniciando carga de datos...");

    mostrarEstadoCarga(true);

    const callbackName =
        "callbackDashboard_" + Date.now();

    const script = document.createElement("script");

    const url =
        API_URL +
        "?callback=" + callbackName +
        "&t=" + Date.now();

    console.log("URL API:", API_URL);
    console.log("URL final consulta:", url);


    let finalizado = false;


    // Callback global JSONP
    window[callbackName] = function (respuesta) {

        finalizado = true;

        console.log("Respuesta recibida desde Apps Script:", respuesta);

        limpiarScript();

        if (!respuesta || respuesta.success !== true) {

            mostrarError(
                "Google Apps Script devolvió un error."
            );

            return;
        }

        if (!Array.isArray(respuesta.datos)) {

            mostrarError(
                "La respuesta no contiene datos válidos."
            );

            return;
        }

        datosOriginales = respuesta.datos;

        console.log("Datos cargados correctamente:", datosOriginales.length);

        mostrarEstadoCarga(false);

        cargarFiltros(datosOriginales);

        aplicarFiltros();

    };


    // Manejo de errores de conexión
    script.onerror = function () {

        if (finalizado) return;

        console.error("ERROR: No se pudo cargar Apps Script");

        limpiarScript();

        mostrarEstadoCarga(false);

        mostrarError(
            "No fue posible conectar con Google Sheets. Verifica que la implementación de Apps Script esté activa y accesible."
        );

    };


    // Timeout de seguridad
    setTimeout(function () {

        if (!finalizado) {

            console.error("Timeout: Apps Script tardó demasiado en responder.");

            limpiarScript();

            mostrarEstadoCarga(false);

            mostrarError(
                "La conexión con Google Sheets está tardando demasiado. Intenta nuevamente."
            );

        }

    }, 30000);


    document.body.appendChild(script);


    function limpiarScript() {

        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

        try {
            delete window[callbackName];
        } catch (e) {
            window[callbackName] = undefined;
        }

    }

}


/****************************************************
 * CARGAR FILTROS DE AÑO Y MES
 ****************************************************/

function cargarFiltros(datos) {

    const selectAnio = document.getElementById("filtroAnio");
    const selectMes = document.getElementById("filtroMes");

    if (!selectAnio || !selectMes) return;


    const anios = new Set();
    const meses = new Set();


    datos.forEach(function (registro) {

        const fecha = obtenerFechaRegistro(registro);

        if (!fecha) return;

        const partes = fecha.split("-");

        if (partes.length !== 3) return;

        const anio = partes[0];
        const mes = partes[1];

        anios.add(anio);
        meses.add(mes);

    });


    // Limpiar opciones existentes
    selectAnio.innerHTML = '<option value="todos">Todos</option>';

    selectMes.innerHTML = '<option value="todos">Todos</option>';


    // Ordenar años descendente
    Array.from(anios)
        .sort((a, b) => b - a)
        .forEach(function (anio) {

            const option = document.createElement("option");

            option.value = anio;
            option.textContent = anio;

            selectAnio.appendChild(option);

        });


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
        .forEach(function (mes) {

            const option = document.createElement("option");

            option.value = mes;
            option.textContent = nombresMeses[parseInt(mes, 10) - 1] || mes;

            selectMes.appendChild(option);

        });

}


/****************************************************
 * OBTENER FECHA DEL REGISTRO
 ****************************************************/

function obtenerFechaRegistro(registro) {

    const posiblesCampos = [

        "Fecha Recepción por la unidad",
        "Fecha Recepcion por la unidad",
        "Fecha recepción",
        "Fecha Recepcion",
        "Fecha Ingreso"

    ];


    for (const campo of posiblesCampos) {

        if (registro[campo]) {

            let valor = registro[campo];

            if (valor instanceof Date) {

                return formatearFecha(valor);

            }

            if (typeof valor === "string") {

                // Si ya viene YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
                    return valor;
                }

                // Si viene DD/MM/YYYY
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {

                    const partes = valor.split("/");

                    return partes[2] + "-" + partes[1] + "-" + partes[0];

                }

            }

        }

    }

    return null;

}


function formatearFecha(fecha) {

    const anio = fecha.getFullYear();

    const mes = String(fecha.getMonth() + 1).padStart(2, "0");

    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;

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


    const datosFiltrados = datosOriginales.filter(function (registro) {

        const fecha = obtenerFechaRegistro(registro);

        if (!fecha) {

            return anioSeleccionado === "todos" &&
                   mesSeleccionado === "todos";

        }


        const partes = fecha.split("-");

        if (partes.length !== 3) return false;


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


    console.log("Datos filtrados:", datosFiltrados.length);


    actualizarDashboard(datosFiltrados);

}


/****************************************************
 * ACTUALIZAR TODO EL DASHBOARD
 ****************************************************/

function actualizarDashboard(datos) {

    actualizarTarjetas(datos);

    actualizarGraficos(datos);

    actualizarTabla(datos);

}


/****************************************************
 * OBTENER ESTADO
 ****************************************************/

function obtenerEstado(registro) {

    return String(
        registro["Pendiente / Cumplido"] || ""
    ).trim().toLowerCase();

}


function obtenerEstadoDetalle(registro) {

    return String(
        registro["Estado"] || ""
    ).trim().toLowerCase();

}


/****************************************************
 * ACTUALIZAR TARJETAS
 ****************************************************/

function actualizarTarjetas(datos) {

    const total = datos.length;


    let respondidos = 0;
    let respondidosParcialmente = 0;
    let pendientes = 0;


    let enPlazo = 0;
    let fueraDePlazo = 0;


    datos.forEach(function (registro) {

        const estadoPrincipal = obtenerEstado(registro);
        const estadoDetalle = obtenerEstadoDetalle(registro);


        // RESPONDIDOS
        if (estadoPrincipal === "respondido") {

            respondidos++;

        }


        // RESPONDIDOS PARCIALMENTE
        if (
            estadoPrincipal === "respondido parcialmente" ||
            estadoPrincipal.includes("parcial")
        ) {

            respondidosParcialmente++;

        }


        // PENDIENTES
        if (
            estadoPrincipal === "pendiente" ||
            estadoPrincipal === "pendiente de respuesta" ||
            estadoPrincipal.includes("pendiente")
        ) {

            pendientes++;

        }


        // CUMPLIMIENTO DE PLAZOS
        if (estadoDetalle.includes("cumplido en plazo")) {

            enPlazo++;

        }

        if (estadoDetalle.includes("fuera de plazo")) {

            fueraDePlazo++;

        }

    });


    const tasaRespuesta =
        total > 0
            ? ((respondidos + respondidosParcialmente) / total) * 100
            : 0;


    const totalRespondidosPlazo =
        enPlazo + fueraDePlazo;


    const cumplimientoPlazo =
        totalRespondidosPlazo > 0
            ? (enPlazo / totalRespondidosPlazo) * 100
            : 0;


    actualizarElemento("totalRequerimientos", total);

    actualizarElemento("respondidos", respondidos);

    actualizarElemento("respondidosParcialmente", respondidosParcialmente);

    actualizarElemento("pendientes", pendientes);


    actualizarElemento("tasaRespuesta", tasaRespuesta.toFixed(1) + "%");

    actualizarElemento("enPlazo", enPlazo);

    actualizarElemento("fueraDePlazo", fueraDePlazo);

    actualizarElemento("cumplimientoPlazo", cumplimientoPlazo.toFixed(1) + "%");

}


function actualizarElemento(id, valor) {

    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }

}


/****************************************************
 * ACTUALIZAR GRÁFICOS
 ****************************************************/

function actualizarGraficos(datos) {

    const respondidos = datos.filter(function (r) {

        return obtenerEstado(r) === "respondido";

    }).length;


    const respondidosParcialmente = datos.filter(function (r) {

        return obtenerEstado(r).includes("parcial");

    }).length;


    const pendientes = datos.filter(function (r) {

        return obtenerEstado(r).includes("pendiente");

    }).length;


    const enPlazo = datos.filter(function (r) {

        return obtenerEstadoDetalle(r).includes("cumplido en plazo");

    }).length;


    const fueraDePlazo = datos.filter(function (r) {

        return obtenerEstadoDetalle(r).includes("fuera de plazo");

    }).length;


    // GRÁFICO SITUACIÓN
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
                        respondidosParcialmente,
                        pendientes
                    ],

                    backgroundColor: [
                        "#3498db",
                        "#f06292",
                        "#f39c12"
                    ],

                    borderWidth: 1

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


    // GRÁFICO PLAZOS
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

                },

                plugins: {

                    legend: {
                        display: true
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


    if (!tbody) return;


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


    datos.forEach(function (registro) {

        const tr = document.createElement("tr");


        const idReclamo =
            registro["ID RECLAMO SUSESO"] || "";


        const fecha =
            obtenerFechaRegistro(registro) || "";


        const pendiente =
            registro["Pendiente / Cumplido"] || "";


        const estado =
            registro["Estado"] || "";


        const requerimiento =
            registro["Requerimiento"] || "";


        tr.innerHTML = `

            <td>${escaparHTML(idReclamo)}</td>

            <td>${escaparHTML(fecha)}</td>

            <td>${escaparHTML(pendiente)}</td>

            <td>${escaparHTML(estado)}</td>

            <td>${escaparHTML(requerimiento)}</td>

        `;


        tbody.appendChild(tr);

    });

}


/****************************************************
 * EVITAR PROBLEMAS DE HTML
 ****************************************************/

function escaparHTML(valor) {

    if (valor === null || valor === undefined) {
        return "";
    }


    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/****************************************************
 * ESTADO DE CARGA
 ****************************************************/

function mostrarEstadoCarga(cargando) {

    let indicador = document.getElementById("indicadorCarga");


    if (!indicador) {

        indicador = document.createElement("div");

        indicador.id = "indicadorCarga";


        indicador.style.position = "fixed";
        indicador.style.top = "20px";
        indicador.style.right = "20px";
        indicador.style.background = "#0d6efd";
        indicador.style.color = "white";
        indicador.style.padding = "12px 18px";
        indicador.style.borderRadius = "8px";
        indicador.style.zIndex = "9999";
        indicador.style.fontWeight = "bold";


        document.body.appendChild(indicador);

    }


    if (cargando) {

        indicador.textContent = "Cargando datos...";
        indicador.style.display = "block";

    } else {

        indicador.style.display = "none";

    }

}


/****************************************************
 * MOSTRAR ERRORES
 ****************************************************/

function mostrarError(mensaje) {

    console.error(mensaje);

    mostrarEstadoCarga(false);


    let alerta = document.getElementById("alertaError");


    if (!alerta) {

        alerta = document.createElement("div");

        alerta.id = "alertaError";


        alerta.style.position = "fixed";
        alerta.style.top = "20px";
        alerta.style.right = "20px";
        alerta.style.background = "#dc3545";
        alerta.style.color = "white";
        alerta.style.padding = "16px 22px";
        alerta.style.borderRadius = "8px";
        alerta.style.zIndex = "10000";
        alerta.style.maxWidth = "400px";
        alerta.style.fontWeight = "bold";
        alerta.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";


        document.body.appendChild(alerta);

    }


    alerta.textContent = mensaje;


    setTimeout(function () {

        if (alerta) {
            alerta.style.display = "none";
        }

    }, 10000);

}
