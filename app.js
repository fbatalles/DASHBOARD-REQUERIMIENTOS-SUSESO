/* =====================================================
   CONFIGURACIÓN
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

    const botonActualizar = document.getElementById("btnActualizar");

    if (botonActualizar) {
        botonActualizar.addEventListener("click", cargarDatos);
    }


    const filtroAnio = document.getElementById("filtroAnio");

    if (filtroAnio) {
        filtroAnio.addEventListener("change", aplicarFiltros);
    }


    const filtroMes = document.getElementById("filtroMes");

    if (filtroMes) {
        filtroMes.addEventListener("change", aplicarFiltros);
    }


    cargarDatos();

});


/* =====================================================
   CARGAR DATOS
   ===================================================== */

async function cargarDatos() {

    mostrarEstadoCarga(true);
    ocultarError();


    try {

        const respuesta = await fetch(
            API_URL + "?t=" + Date.now()
        );


        if (!respuesta.ok) {
            throw new Error(
                "Error HTTP: " + respuesta.status
            );
        }


        const resultado = await respuesta.json();


        if (!resultado.success) {
            throw new Error(
                resultado.error || "La API devolvió un error."
            );
        }


        datosOriginales = Array.isArray(resultado.datos)
            ? resultado.datos
            : [];


        datosFiltrados = [...datosOriginales];


        console.log(
            "Datos cargados correctamente:",
            datosOriginales.length
        );


        console.log(
            "Primer registro:",
            datosOriginales[0]
        );


        llenarFiltroAnio();

        actualizarDashboard(datosFiltrados);

        mostrarEstadoCarga(false);


    } catch (error) {

        console.error("Error al cargar datos:", error);

        mostrarEstadoCarga(false);

        mostrarError(
            "No fue posible cargar la información desde Google Sheets. " +
            "Revisa la consola del navegador para más detalles."
        );

    }

}


/* =====================================================
   FILTRO DE AÑO
   ===================================================== */

function llenarFiltroAnio() {

    const filtroAnio = document.getElementById("filtroAnio");

    if (!filtroAnio) return;


    const anios = new Set();


    datosOriginales.forEach(item => {

        const fecha = obtenerFechaRecepcion(item);

        if (fecha) {
            anios.add(fecha.getFullYear());
        }

    });


    const aniosOrdenados = [...anios].sort(
        (a, b) => b - a
    );


    filtroAnio.innerHTML = "";

    filtroAnio.innerHTML = `
        <option value="">Todos los años</option>
    `;


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


    const anioSeleccionado = filtroAnio
        ? filtroAnio.value
        : "";

    const mesSeleccionado = filtroMes
        ? filtroMes.value
        : "";


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
   ACTUALIZAR DASHBOARD
   ===================================================== */

function actualizarDashboard(datos) {

    actualizarTarjetas(datos);

    actualizarGraficoSituacion(datos);

    actualizarGraficoPlazos(datos);

    actualizarTabla(datos);

}


/* =====================================================
   ACTUALIZAR TARJETAS
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


    const enPlazo = datos.filter(item =>
        obtenerEstadoPlazo(item) === "en plazo"
    ).length;


    const fueraDePlazo = datos.filter(item =>
        obtenerEstadoPlazo(item) === "fuera de plazo"
    ).length;


    /*
     * Se consideran respondidos tanto los completos
     * como los parcialmente respondidos.
     */

    const totalRespondidos =
        respondidos + respondidosParcialmente;


    const tasaRespuesta = total > 0
        ? ((totalRespondidos / total) * 100).toFixed(1)
        : "0.0";


    const totalConEstadoPlazo =
        enPlazo + fueraDePlazo;


    const cumplimientoPlazo = totalConEstadoPlazo > 0
        ? ((enPlazo / totalConEstadoPlazo) * 100).toFixed(1)
        : "0.0";


    actualizarElemento(
        "totalRequerimientos",
        total
    );


    actualizarElemento(
        "respondidos",
        respondidos
    );


    actualizarElemento(
        "respondidosParcialmente",
        respondidosParcialmente
    );


    actualizarElemento(
        "pendientes",
        pendientes
    );


    actualizarElemento(
        "tasaRespuesta",
        tasaRespuesta + "%"
    );


    actualizarElemento(
        "enPlazo",
        enPlazo
    );


    actualizarElemento(
        "fueraDePlazo",
        fueraDePlazo
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

    if (!canvas || typeof Chart === "undefined") {
        return;
    }


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

                borderColor: "#ffffff",

                borderWidth: 3

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

                        boxWidth: 18,

                        padding: 8,

                        font: {
                            size: 12
                        }

                    }

                },

                tooltip: {

                    callbacks: {

                        label: function (context) {

                            const total =
                                context.dataset.data.reduce(
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
   GRÁFICO DE PLAZOS
   ===================================================== */

function actualizarGraficoPlazos(datos) {

    const canvas = document.getElementById("graficoPlazos");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }


    const enPlazo = datos.filter(item =>
        obtenerEstadoPlazo(item) === "en plazo"
    ).length;


    const fueraDePlazo = datos.filter(item =>
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
                    enPlazo,
                    fueraDePlazo
                ],

                backgroundColor: [
                    "#27ae60",
                    "#e74c3c"
                ],

                borderRadius: 6,

                barThickness: 48,

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

                        autoSkip: false,

                        maxRotation: 0,

                        minRotation: 0

                    }

                },

                y: {

                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    },

                    grid: {
                        color: "#e2e8f0"
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
   ACTUALIZAR TABLA
   ===================================================== */

function actualizarTabla(datos) {

    const tablaEncabezados =
        document.getElementById("encabezadosTabla");

    const tablaDatos =
        document.getElementById("tablaDatos");

    const contador =
        document.getElementById("contadorRegistros");


    if (!tablaEncabezados || !tablaDatos) {
        return;
    }


    tablaEncabezados.innerHTML = "";
    tablaDatos.innerHTML = "";


    if (contador) {
        contador.textContent =
            datos.length +
            (datos.length === 1 ? " registro" : " registros");
    }


    if (datos.length === 0) {

        tablaDatos.innerHTML = `
            <tr>
                <td colspan="100%">
                    No existen registros para los filtros seleccionados.
                </td>
            </tr>
        `;

        return;

    }


    const encabezados = obtenerEncabezados(datos);


    encabezados.forEach(encabezado => {

        const th = document.createElement("th");

        th.textContent = encabezado;

        tablaEncabezados.appendChild(th);

    });


    datos.forEach(item => {

        const tr = document.createElement("tr");


        encabezados.forEach(encabezado => {

            const td = document.createElement("td");

            const valor = item[encabezado];

            td.textContent = formatearValor(valor);

            tr.appendChild(td);

        });


        tablaDatos.appendChild(tr);

    });

}


/* =====================================================
   OBTENER ENCABEZADOS
   ===================================================== */

function obtenerEncabezados(datos) {

    if (!Array.isArray(datos) || datos.length === 0) {
        return [];
    }


    const encabezados = new Set();


    datos.forEach(item => {

        Object.keys(item).forEach(clave => {
            encabezados.add(clave);
        });

    });


    return [...encabezados];

}


/* =====================================================
   OBTENER SITUACIÓN
   ===================================================== */

function obtenerSituacion(item) {

    const encabezados = Object.keys(item);


    /*
     * Primero busca encabezados conocidos.
     */

    const posiblesEncabezados = [

        "Situación",
        "Situacion",
        "Estado de respuesta",
        "Estado Respuesta",
        "Situación del requerimiento",
        "Situacion del requerimiento"

    ];


    let valor = obtenerValorPorEncabezado(
        item,
        posiblesEncabezados
    );


    /*
     * Si no encuentra uno, utiliza la primera columna,
     * porque según la estructura de la hoja la situación
     * se encuentra en la columna A.
     */

    if (
        valor === "" ||
        valor === null ||
        valor === undefined
    ) {

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
        "Fecha de recepcion por la unidad",
        "Fecha recepción por la unidad",
        "Fecha Recepción",
        "Fecha de Recepción",
        "Fecha recepción",
        "Fecha"

    ];


    const valor = obtenerValorPorEncabezado(
        item,
        posiblesEncabezados
    );


    if (
        valor === "" ||
        valor === null ||
        valor === undefined
    ) {

        return null;

    }


    return convertirFecha(valor);

}


/* =====================================================
   OBTENER VALOR POR ENCABEZADO
   ===================================================== */

function obtenerValorPorEncabezado(
    item,
    encabezadosBuscados
) {

    const claves = Object.keys(item);


    for (const buscado of encabezadosBuscados) {

        const encontrado = claves.find(clave =>
            normalizarEncabezado(clave) ===
            normalizarEncabezado(buscado)
        );


        if (encontrado !== undefined) {

            return item[encontrado];

        }

    }


    return "";

}


/* =====================================================
   NORMALIZAR ENCABEZADO
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
   CONVERTIR FECHA
   ===================================================== */

function convertirFecha(valor) {

    if (!valor) {
        return null;
    }


    if (valor instanceof Date && !isNaN(valor)) {
        return valor;
    }


    const texto = String(valor).trim();


    /*
     * Formato dd/mm/yyyy
     */

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


    /*
     * Formato yyyy-mm-dd
     */

    const fechaISO = new Date(texto);


    if (!isNaN(fechaISO)) {
        return fechaISO;
    }


    return null;

}


/* =====================================================
   FORMATEAR VALOR
   ===================================================== */

function formatearValor(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "";

    }


    return String(valor);

}


/* =====================================================
   ACTUALIZAR ELEMENTO
   ===================================================== */

function actualizarElemento(id, valor) {

    const elemento = document.getElementById(id);


    if (elemento) {
        elemento.textContent = valor;
    }

}


/* =====================================================
   MOSTRAR ESTADO DE CARGA
   ===================================================== */

function mostrarEstadoCarga(cargando) {

    const loading = document.getElementById("loading");


    if (!loading) return;


    loading.style.display = cargando
        ? "block"
        : "none";

}


/* =====================================================
   MOSTRAR ERROR
   ===================================================== */

function mostrarError(mensaje) {

    const elemento =
        document.getElementById("mensajeError");


    if (!elemento) return;


    elemento.textContent = mensaje;

    elemento.style.display = "block";

}


/* =====================================================
   OCULTAR ERROR
   ===================================================== */

function ocultarError() {

    const elemento =
        document.getElementById("mensajeError");


    if (!elemento) return;


    elemento.textContent = "";

    elemento.style.display = "none";

}
