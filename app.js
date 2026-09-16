/* =====================================================
   CONFIGURACIÓN GENERAL
   ===================================================== */

const API_URL =
    "https://script.google.com/macros/s/AKfycbzIh4iHMRz-J1OlWpIhPVe9P4xbf2P1AOpfHr6IoNLTiwgG1t1xqLjvzJwvPCg6ULSWIg/exec";


let datosOriginales = [];
let datosFiltrados = [];

let graficoSituacion = null;
let graficoPlazos = null;


/* =====================================================
   INICIO
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    configurarEventosFiltros();

    cargarDatos();

});


/* =====================================================
   CARGAR DATOS DESDE GOOGLE SHEETS
   ===================================================== */

async function cargarDatos() {

    try {

        mostrarEstadoCarga(true);

        const respuesta = await fetch(API_URL + "?t=" + Date.now());

        if (!respuesta.ok) {
            throw new Error("Error HTTP: " + respuesta.status);
        }

        const resultado = await respuesta.json();

        if (!resultado.success) {
            throw new Error(
                resultado.error || "No se pudieron cargar los datos"
            );
        }

        datosOriginales = resultado.datos || [];

        datosFiltrados = [...datosOriginales];

        console.log("Datos cargados:", datosOriginales.length);

        llenarFiltros();

        actualizarDashboard(datosFiltrados);

        mostrarEstadoCarga(false);

    } catch (error) {

        console.error("Error al cargar los datos:", error);

        mostrarEstadoCarga(false);

        mostrarError(
            "No fue posible cargar la información. Revisa la conexión con Google Sheets."
        );

    }

}


/* =====================================================
   EVENTOS DE FILTROS
   ===================================================== */

function configurarEventosFiltros() {

    const filtroAnio = document.getElementById("filtroAnio");
    const filtroMes = document.getElementById("filtroMes");

    if (filtroAnio) {
        filtroAnio.addEventListener("change", aplicarFiltros);
    }

    if (filtroMes) {
        filtroMes.addEventListener("change", aplicarFiltros);
    }

}


/* =====================================================
   LLENAR FILTRO DE AÑOS
   ===================================================== */

function llenarFiltros() {

    const filtroAnio = document.getElementById("filtroAnio");

    if (!filtroAnio) return;

    const anios = new Set();

    datosOriginales.forEach(item => {

        const fecha = obtenerFechaRecepcion(item);

        if (fecha) {
            anios.add(fecha.getFullYear());
        }

    });

    const aniosOrdenados = [...anios].sort((a, b) => b - a);

    filtroAnio.innerHTML = "";

    const opcionTodos = document.createElement("option");
    opcionTodos.value = "";
    opcionTodos.textContent = "Todos los años";
    filtroAnio.appendChild(opcionTodos);

    aniosOrdenados.forEach(anio => {

        const opcion = document.createElement("option");

        opcion.value = anio;
        opcion.textContent = anio;

        filtroAnio.appendChild(opcion);

    });

}


/* =====================================================
   APLICAR FILTROS
   ===================================================== */

function aplicarFiltros() {

    const filtroAnio = document.getElementById("filtroAnio");
    const filtroMes = document.getElementById("filtroMes");

    const anioSeleccionado = filtroAnio ? filtroAnio.value : "";
    const mesSeleccionado = filtroMes ? filtroMes.value : "";

    datosFiltrados = datosOriginales.filter(item => {

        const fecha = obtenerFechaRecepcion(item);

        if (!fecha) {
            return false;
        }

        const anio = fecha.getFullYear();
        const mes = fecha.getMonth() + 1;

        const coincideAnio =
            anioSeleccionado === "" ||
            String(anio) === String(anioSeleccionado);

        const coincideMes =
            mesSeleccionado === "" ||
            String(mes) === String(mesSeleccionado);

        return coincideAnio && coincideMes;

    });

    actualizarDashboard(datosFiltrados);

}


/* =====================================================
   ACTUALIZAR TODO EL DASHBOARD
   ===================================================== */

function actualizarDashboard(datos) {

    actualizarTarjetas(datos);

    actualizarGraficoSituacion(datos);

    actualizarGraficoPlazos(datos);

    actualizarTabla(datos);

}


/* =====================================================
   TARJETAS
   ===================================================== */

function actualizarTarjetas(datos) {

    const total = datos.length;

    const respondidos = datos.filter(item =>
        obtenerSituacion(item) === "respondido"
    ).length;

    const respondidosParcialmente = datos.filter(item =>
        obtenerSituacion(item) === "respondido parcialmente"
    ).length;

    const pendientes = datos.filter(item =>
        obtenerSituacion(item) === "pendiente de respuesta"
    ).length;


    const respondidosEnPlazo = datos.filter(item =>
        obtenerEstadoPlazo(item) === "en plazo"
    ).length;

    const respondidosFueraDePlazo = datos.filter(item =>
        obtenerEstadoPlazo(item) === "fuera de plazo"
    ).length;


    const tasaRespuesta = total > 0
        ? ((respondidos / total) * 100).toFixed(1)
        : 0;


    const totalRespondidosConEstado =
        respondidosEnPlazo + respondidosFueraDePlazo;


    const cumplimientoPlazo = totalRespondidosConEstado > 0
        ? (
            (respondidosEnPlazo / totalRespondidosConEstado) * 100
        ).toFixed(1)
        : 0;


    actualizarElemento("totalRequerimientos", total);

    actualizarElemento("respondidos", respondidos);

    actualizarElemento(
        "respondidosParcialmente",
        respondidosParcialmente
    );

    actualizarElemento("pendientes", pendientes);

    actualizarElemento(
        "tasaRespuesta",
        tasaRespuesta + "%"
    );

    actualizarElemento(
        "enPlazo",
        respondidosEnPlazo
    );

    actualizarElemento(
        "fueraDePlazo",
        respondidosFueraDePlazo
    );

    actualizarElemento(
        "cumplimientoPlazo",
        cumplimientoPlazo + "%"
    );

}


/* =====================================================
   GRÁFICO DE SITUACIÓN
   ===================================================== */

function actualizarGraficoSituacion(datos) {

    const canvas = document.getElementById("graficoSituacion");

    if (!canvas) return;


    const respondidos = datos.filter(item =>
        obtenerSituacion(item) === "respondido"
    ).length;

    const respondidosParcialmente = datos.filter(item =>
        obtenerSituacion(item) === "respondido parcialmente"
    ).length;

    const pendientes = datos.filter(item =>
        obtenerSituacion(item) === "pendiente de respuesta"
    ).length;


    if (graficoSituacion) {
        graficoSituacion.destroy();
    }


    graficoSituacion = new Chart(canvas, {

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
                    "#ec5b91",
                    "#f39c12"
                ],

                borderWidth: 2,

                borderColor: "#ffffff"

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "58%",

            plugins: {

                legend: {

                    position: "top",

                    labels: {

                        boxWidth: 22,

                        padding: 8,

                        font: {
                            size: 12
                        }

                    }

                },

                tooltip: {

                    callbacks: {

                        label: function (context) {

                            const total = context.dataset.data.reduce(
                                (a, b) => a + b,
                                0
                            );

                            const valor = context.raw;

                            const porcentaje = total > 0
                                ? ((valor / total) * 100).toFixed(1)
                                : 0;

                            return (
                                context.label +
                                ": " +
                                valor +
                                " (" +
                                porcentaje +
                                "%)"
                            );

                        }

                    }

                }

            },

            layout: {

                padding: 0

            }

        }

    });

}


/* =====================================================
   GRÁFICO DE CUMPLIMIENTO DE PLAZOS
   ===================================================== */

function actualizarGraficoPlazos(datos) {

    const canvas = document.getElementById("graficoPlazos");

    if (!canvas) return;


    const respondidosEnPlazo = datos.filter(item =>
        obtenerEstadoPlazo(item) === "en plazo"
    ).length;

    const respondidosFueraDePlazo = datos.filter(item =>
        obtenerEstadoPlazo(item) === "fuera de plazo"
    ).length;


    if (graficoPlazos) {
        graficoPlazos.destroy();
    }


    graficoPlazos = new Chart(canvas, {

        type: "bar",

        data: {

            labels: [
                "Respondidos en plazo",
                "Respondidos fuera de plazo"
            ],

            datasets: [{

                label: "Cantidad",

                data: [
                    respondidosEnPlazo,
                    respondidosFueraDePlazo
                ],

                backgroundColor: [
                    "#27ae60",
                    "#e74c3c"
                ],

                borderRadius: 6,

                barThickness: 45,

                maxBarThickness: 55

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {

                    callbacks: {

                        label: function (context) {

                            return "Cantidad: " + context.raw;

                        }

                    }

                }

            },

            scales: {

                x: {

                    grid: {
                        display: false
                    },

                    ticks: {

                        font: {
                            size: 12
                        },

                        autoSkip: false

                    }

                },

                y: {

                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    },

                    grid: {
                        color: "#e5e7eb"
                    }

                }

            },

            layout: {

                padding: 0

            }

        }

    });

}


/* =====================================================
   TABLA
   ===================================================== */

function actualizarTabla(datos) {

    const tabla = document.getElementById("tablaDatos");

    if (!tabla) return;


    const encabezados = obtenerEncabezados(datos);


    tabla.innerHTML = "";


    if (datos.length === 0) {

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td colspan="100%">
                No existen requerimientos para los filtros seleccionados.
            </td>
        `;

        tabla.appendChild(fila);

        return;

    }


    datos.forEach(item => {

        const fila = document.createElement("tr");


        encabezados.forEach(encabezado => {

            const celda = document.createElement("td");

            let valor = item[encabezado] ?? "";

            if (valor instanceof Object) {
                valor = JSON.stringify(valor);
            }

            celda.textContent = formatearValor(valor);

            fila.appendChild(celda);

        });


        tabla.appendChild(fila);

    });

}


/* =====================================================
   OBTENER ENCABEZADOS
   ===================================================== */

function obtenerEncabezados(datos) {

    if (!datos || datos.length === 0) return [];

    return Object.keys(datos[0]);

}


/* =====================================================
   OBTENER SITUACIÓN
   ===================================================== */

function obtenerSituacion(item) {

    const posiblesEncabezados = [
        "Situación",
        "Situacion",
        "situación",
        "situacion",
        "Estado de respuesta",
        "Estado Respuesta",
        "Estado"
    ];


    let valor = obtenerValorPorEncabezado(
        item,
        posiblesEncabezados
    );


    // Si no encuentra el encabezado, revisa la primera columna.
    if (!valor) {

        const encabezados = Object.keys(item);

        if (encabezados.length > 0) {
            valor = item[encabezados[0]];
        }

    }


    return normalizarTexto(valor);

}


/* =====================================================
   OBTENER ESTADO DE PLAZO
   ===================================================== */

function obtenerEstadoPlazo(item) {

    const posiblesEncabezados = [
        "Estado",
        "estado",
        "Estado de plazo",
        "Estado Plazo",
        "Cumplimiento de plazo"
    ];


    const valor = obtenerValorPorEncabezado(
        item,
        posiblesEncabezados
    );


    const estado = normalizarTexto(valor);


    if (
        estado.includes("fuera de plazo") ||
        estado.includes("fuera plazo")
    ) {
        return "fuera de plazo";
    }


    if (
        estado.includes("en plazo") ||
        estado.includes("dentro de plazo")
    ) {
        return "en plazo";
    }


    return "";

}


/* =====================================================
   OBTENER FECHA DE RECEPCIÓN
   ===================================================== */

function obtenerFechaRecepcion(item) {

    const posiblesEncabezados = [

        "Fecha de recepción por la unidad",

        "Fecha recepción por la unidad",

        "Fecha de recepcion por la unidad",

        "Fecha Recepción",

        "Fecha de Recepción",

        "Fecha recepción",

        "Fecha"

    ];


    const valor = obtenerValorPorEncabezado(
        item,
        posiblesEncabezados
    );


    if (!valor) return null;


    return convertirFecha(valor);

}


/* =====================================================
   BUSCAR VALOR SEGÚN ENCABEZADO
   ===================================================== */

function obtenerValorPorEncabezado(item, encabezadosBuscados) {

    const claves = Object.keys(item);


    for (const encabezadoBuscado of encabezadosBuscados) {

        const encontrado = claves.find(clave =>
            normalizarEncabezado(clave) ===
            normalizarEncabezado(encabezadoBuscado)
        );


        if (encontrado !== undefined) {
            return item[encontrado];
        }

    }


    return "";

}


/* =====================================================
   NORMALIZAR ENCABEZADOS
   ===================================================== */

function normalizarEncabezado(texto) {

    return String(texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


/* =====================================================
   NORMALIZAR TEXTO
   ===================================================== */

function normalizarTexto(texto) {

    return String(texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


/* =====================================================
   CONVERTIR FECHAS
   ===================================================== */

function convertirFecha(valor) {

    if (!valor) return null;


    if (valor instanceof Date && !isNaN(valor)) {
        return valor;
    }


    const texto = String(valor).trim();


    // Formato dd/mm/yyyy
    const partes = texto.split("/");

    if (partes.length === 3) {

        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const anio = parseInt(partes[2], 10);

        if (
            !isNaN(dia) &&
            !isNaN(mes) &&
            !isNaN(anio)
        ) {

            return new Date(anio, mes, dia);

        }

    }


    // Formato yyyy-mm-dd
    const fechaISO = new Date(texto);

    if (!isNaN(fechaISO)) {
        return fechaISO;
    }


    return null;

}


/* =====================================================
   FORMATEAR VALORES
   ===================================================== */

function formatearValor(valor) {

    if (valor === null || valor === undefined) {
        return "";
    }


    if (typeof valor === "string") {

        const fecha = convertirFecha(valor);

        if (fecha && valor.includes("/")) {

            return fecha.toLocaleDateString("es-CL");

        }

    }


    return valor;

}


/* =====================================================
   ACTUALIZAR ELEMENTOS HTML
   ===================================================== */

function actualizarElemento(id, valor) {

    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }

}


/* =====================================================
   MOSTRAR / OCULTAR CARGA
   ===================================================== */

function mostrarEstadoCarga(cargando) {

    const elementos = document.querySelectorAll(
        ".loading, #loading, .spinner"
    );


    elementos.forEach(elemento => {

        elemento.style.display = cargando
            ? "block"
            : "none";

    });

}


/* =====================================================
   MOSTRAR ERROR
   ===================================================== */

function mostrarError(mensaje) {

    const contenedor = document.getElementById("mensajeError");

    if (contenedor) {

        contenedor.textContent = mensaje;

        contenedor.style.display = "block";

    }

    console.error(mensaje);

}
