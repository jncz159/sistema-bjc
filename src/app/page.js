"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - CONTROL EMPRESARIAL
 * VERSION: 68.0 - MASTER TITANIUM SHIELD (TOTALMENTE EXPANDIDO)
 * ESTADO: BLINDAJE ATÓMICO CONTRA ERRORES DE CARGA INICIAL
 * ============================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] HELPERS DE SEGURIDAD (ANTI-CRASH)
  // ============================================================

  /**
   * getFechaPeru:
   * Normaliza cualquier timestamp al formato YYYY-MM-DD de Chiclayo.
   * Blindaje: Evita el error "undefined" devolviendo la fecha actual si falla.
   */
  const getFechaPeru = (dateInput) => {
    try {
        const fechaBase = dateInput ? new Date(dateInput) : new Date();
        
        if (isNaN(fechaBase.getTime())) {
            const fallbackHoy = new Date();
            const aF = fallbackHoy.getFullYear();
            const mF = String(fallbackHoy.getMonth() + 1).padStart(2, '0');
            const dF = String(fallbackHoy.getDate()).padStart(2, '0');
            return `${aF}-${mF}-${dF}`;
        }

        const opcionesLocal = { 
            timeZone: "America/Lima", 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        };
        
        const formateadorBJ = new Intl.DateTimeFormat('en-CA', opcionesLocal);
        const partesBJ = formateadorBJ.formatToParts(fechaBase);
        
        const anioBJ = partesBJ.find(p => p.type === 'year')?.value || "2026";
        const mesBJ = partesBJ.find(p => p.type === 'month')?.value || "01";
        const diaBJ = partesBJ.find(p => p.type === 'day')?.value || "01";
        
        return `${anioBJ}-${mesBJ}-${diaBJ}`;
    } catch (eF) { 
        console.error("Error en helper Fecha:", eF);
        return new Date().toISOString().split('T')[0]; 
    }
  };

  /**
   * getHoraPeru:
   * Extrae la hora exacta de una operación en formato 12H (AM/PM).
   */
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const dH = new Date(dateInput);
        if (isNaN(dH.getTime())) return "--:--";
        
        const configH = { 
            timeZone: "America/Lima", 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        };
        
        return dH.toLocaleTimeString('es-PE', configH);
    } catch (eH) { 
        return "--:--"; 
    }
  };

  /**
   * handleInputMonto:
   * Limpia inputs de precio para evitar errores de cálculo por comas o letras.
   */
  const handleInputMonto = (valorCrudo) => {
    if (valorCrudo === undefined || valorCrudo === null) return "";
    const aTexto = String(valorCrudo);
    const conPunto = aTexto.replace(',', '.');
    const soloNum = conPunto.replace(/[^0-9.]/g, '');
    return soloNum;
  };

  /**
   * getEtiquetaProducto:
   * Identifica ingresos recientes para el catálogo.
   */
  const getEtiquetaProducto = (fCreacion) => {
    if (!fCreacion) return null;
    try {
        const fCreacionObj = new Date(fCreacion);
        const fHoyObj = new Date();
        const mPorDia = 1000 * 60 * 60 * 24;
        const diffD = Math.floor((fHoyObj - fCreacionObj) / mPorDia);
        
        if (diffD <= 3) {
            return { tipo: 'NUEVO', icono: '✨', color: '#F01097' };
        } else if (diffD <= 8) {
            return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        }
        return null;
    } catch (eTag) { return null; }
  };

  // ============================================================
  // [BLOQUE 2] ALMACÉN DE ESTADOS (REACT STATE MANAGEMENT)
  // ============================================================

  // --- 2.1 Datos Globales ---
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- 2.2 Control de Navegación ---
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  // --- 2.3 Filtros de Búsqueda ---
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // --- 2.4 Memoria de la Venta (Carrito) ---
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- 2.5 Estados de Edición ---
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // --- 2.6 Estados de Gestión ---
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStock, setFormEditStock] = useState({}); 

  // --- 2.7 Paleta de Colores Platinum ---
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================
  // [BLOQUE 3] NÚCLEO DE DATOS (DB & REALTIME SUPABASE)
  // ============================================================

  useEffect(() => {
    const arrancarSistemaMaster = async () => {
        await cargarTodoDesdeNube();
        setCargando(false);
    };
    arrancarSistemaMaster();

    // Sincronización Platinum v68 sin una sola simplificación
    const chSales = supabase.channel('v68-real-sales').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodoDesdeNube()).subscribe();
    const chProd = supabase.channel('v68-real-prod').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodoDesdeNube()).subscribe();
    const chFin = supabase.channel('v68-real-fin').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodoDesdeNube()).subscribe();

    return () => {
      supabase.removeChannel(chSales);
      supabase.removeChannel(chProd);
      supabase.removeChannel(chFin);
    };
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: dP } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: dV } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: dF } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        
        if (dP) setProductos(dP);
        if (dV) setVentas(dV);
        if (dF) setFinanzas(dF);
    } catch (errorMaster) { 
        console.error("Error fatal en sincronización Supabase:", errorMaster); 
    }
  };

  // ============================================================
  // [BLOQUE 4] LÓGICA ESTRATÉGICA (MEMOS ANALÍTICOS BLINDADOS)
  // ============================================================

  // 4.1 LOGÍSTICA: Clasificación Operativa
  const logisticaInteligente = useMemo(() => {
    const resLogistica = { almacen: [], cuentasPorCobrar: [] };
    if (!Array.isArray(ventas) || ventas.length === 0) return resLogistica;

    try {
        const mapaTemporalAlmacen = {}; 
        const mapaTemporalDeudores = {};

        ventas.forEach(registro => {
            if (!registro || !registro.cliente_nombre) return;
            const llaveCliente = `${registro.cliente_nombre}-${registro.localidad || 'SN'}`;
            
            if (registro.estado_pedido === 'En Almacén') {
                if (!mapaTemporalAlmacen[llaveCliente]) {
                    mapaTemporalAlmacen[llaveCliente] = { cliente: registro.cliente_nombre, localidad: registro.localidad, telefono: registro.telefono, items: [], total: 0 };
                }
                mapaTemporalAlmacen[llaveCliente].items.push(registro);
                mapaTemporalAlmacen[llaveCliente].total += (Number(registro.precio_venta_unitario || 0) * Number(registro.cantidad || 0));
            }
            
            if (registro.estado_pedido === 'Pendiente de Pago') {
                if (!mapaTemporalDeudores[llaveCliente]) {
                    mapaTemporalDeudores[llaveCliente] = { cliente: registro.cliente_nombre, localidad: registro.localidad, telefono: registro.telefono, items: [], total: 0 };
                }
                mapaTemporalDeudores[llaveCliente].items.push(registro);
                mapaTemporalDeudores[llaveCliente].total += (Number(registro.precio_venta_unitario || 0) * Number(registro.cantidad || 0));
            }
        });

        resLogistica.almacen = Object.values(mapaTemporalAlmacen);
        resLogistica.cuentasPorCobrar = Object.values(mapaTemporalDeudores);
        return resLogistica;
    } catch (eL) { return resLogistica; }
  }, [ventas]);

  // 4.2 HISTORIAL: Ventas agrupadas
  const historialVentasDiaBJ = useMemo(() => {
    if (!Array.isArray(ventas) || ventas.length === 0) return [];
    try {
        const filtradasH = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const agrupadasH = {};

        filtradasH.forEach(v => {
            const hCorte = v.created_at ? v.created_at.substring(0,16) : "0000";
            const idAgrup = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${hCorte}`; 
            
            if (!agrupadasH[idAgrup]) {
                agrupadasH[idAgrup] = { id_grupo: idAgrup, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            agrupadasH[idAgrup].items.push(v);
            agrupadasH[idAgrup].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(agrupadasH).reverse();
    } catch (eH) { return []; }
  }, [ventas, fechaConsulta]);

  // 4.3 BALANCE FINANCIERO CRÍTICO (BUNKER v68 - EL MÁS PROTEGIDO)
  const balanceBunkerElite = useMemo(() => {
    const errorSafeObj = { cajaHoy: 0, ganHoy: 0, cajaGlobal: 0, bovedaRetiro: 0, pe_progreso: 0, pe_gan: 0, pe_meta: 0 };
    if (!Array.isArray(ventas) || !Array.isArray(finanzas)) return errorSafeObj;

    try {
        const fL = finanzas;
        const vL = ventas;
        const hoyS = getFechaPeru();
        const mesI = hoyS.substring(0,7);
        
        // --- DINERO DE HOY (EFECTIVO PAGADO) ---
        const vH = vL.filter(v => v && getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago');
        
        // --- BÓVEDA (UTILIDAD REAL PARA TI) ---
        const gananciaBrutaVentasAcumulada = vL.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retirosMarcadosComoGanancia = fL.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // --- CAJA GLOBAL (DINERO TOTAL FÍSICO) ---
        const ingresosVentasEfectivo = vL.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const ingresosCapitalExterno = fL.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const egresosGlobalesEfectuados = fL.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // --- PUNTO DE EQUILIBRIO ---
        const gastosOperativosMensuales = fL.filter(f => {
            if (!f || !f.created_at) return false;
            return getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo);
        }).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        const utilidadesVentasMensuales = vL.filter(v => {
            if (!v || !v.created_at) return false;
            return getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Pendiente de Pago';
        }).reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0);

        let pMetaBJ = 0;
        if (gastosOperativosMensuales > 0) {
            pMetaBJ = (utilidadesVentasMensuales / gastosOperativosMensuales) * 100;
        } else if (utilidadesVentasMensuales > 0) {
            pMetaBJ = 100;
        }

        return { 
            cajaHoy: vH.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            ganHoy: vH.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cajaGlobal: (ingresosVentasEfectivo + ingresosCapitalExterno - egresosGlobalesEfectuados),
            bovedaRetiro: (gananciaBrutaVentasAcumulada - retirosMarcadosComoGanancia),
            pe_progreso: pMetaBJ,
            pe_gan: utilidadesVentasMensuales,
            pe_meta: gastosOperativosMensuales
        };
    } catch (eCrítico) { 
        console.error("Falla en Cálculos de Gestión:", eCrítico);
        return errorSafeObj;
    }
  }, [finanzas, ventas]);

  // 4.4 ANALÍTICA DE PRODUCTOS (Resiliente)
  const analyticsMasterBJ = useMemo(() => {
    try {
        const dicRank = {};
        (ventas || []).forEach(v => {
            if (!v) return;
            const pMatch = productos.find(prod => prod.id === v.producto_id);
            const nMod = pMatch ? pMatch.nombre : "Modelo Descatalogado";
            dicRank[nMod] = (dicRank[nMod] || 0) + Number(v.ganancia_total || 0);
        });
        const rFinal = Object.entries(dicRank).sort((a,b) => b[1] - a[1]).slice(0, 5);

        const diaHoyA = new Date();
        const dormidosBJ = (productos || []).filter(p => {
            if (!p) return false;
            const histVp = (ventas || []).filter(v => v && v.producto_id === p.id);
            const uVen = histVp.pop();
            if (!uVen) return true; 
            const dDiff = Math.floor((diaHoyA - new Date(uVen.created_at)) / (1000 * 60 * 60 * 24));
            return dDiff > 20 && p.stock > 0;
        }).slice(0, 5);

        return { ranking: rFinal, dormidos: dormidosBJ };
    } catch (eAn) { return { ranking: [], dormidos: [] }; }
  }, [ventas, productos]);

  const valorizacionInventarioTotal = useMemo(() => {
    let cTotal = 0; let vTotal = 0;
    if (!Array.isArray(productos)) return { cost: 0, vent: 0, util: 0 };
    productos.forEach(p => { 
        if (!p) return;
        const sAct = Number(p.stock || 0);
        if (sAct > 0) { 
            cTotal += (Number(p.precio_compra || 0) * sAct); 
            vTotal += (Number(p.precio_venta || 0) * sAct); 
        } 
    });
    return { cost: cTotal, vent: vTotal, util: vTotal - cTotal };
  }, [productos]);

  const seriesROIConfig = [
    { n: 'Costo Almacén', v: valorizacionInventarioTotal.cost || 0, fill: OSCURO_BJ },
    { n: 'Retorno Estimado', v: valorizacionInventarioTotal.vent || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [BLOQUE 5] FUNCIONES DE ACCIÓN (LÓGICA OPERATIVA COMPLETA)
  // ============================================================

  // 5.1 AUTOCOMPLETADO (RESTABLECIDO)
  const handleSeleccionarClienteAuto = (e) => {
    const valC = e.target.value; 
    setCliente(valC);
    const mBJ = (ventas || []).find(ven => ven && ven.cliente_nombre?.toLowerCase() === valC.toLowerCase());
    if (mBJ) { 
        setLocalidad(mBJ.localidad || ''); 
        setTelefono(mBJ.telefono || ''); 
    }
  };

  // 5.2 GESTIÓN DE CARRITO
  const handleAddAlCarritoElite = (p) => {
    const canM = Number(cantidades[p.id] || 1);
    const preM = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const yaEnC = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if ((Number(p.stock) || 0) < canM + yaEnC) return alert("¡Sin stock físico suficiente!");
    setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: canM, color: (coloresElegidos[p.id] || "Único"), precio_venta: preM, precio_compra: p.precio_compra }]);
  };

  // 5.3 PROCESO DE VENTA FINAL (BLINDADO)
  const handleEjecutarVentaBJ = async (estadoOperativo) => {
    if (!cliente || !localidad) return alert("Error: Faltan datos del cliente (Nombre/Zona).");
    if (carrito.length === 0) return alert("Error: El carrito está vacío.");
    
    const tV_total = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const factor_D = tV_total > 0 ? (Number(descuento) / tV_total) : 0;

    const listaInserts = carrito.map(i => {
        const pv_it = Number(i.precio_venta);
        const pc_it = Number(i.precio_compra || 0);
        return { 
            cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pv_it, 
            precio_costo_unitario: pc_it, 
            ganancia_total: ((pv_it - pc_it) * i.cantidad) - ((pv_it * i.cantidad) * factor_D), 
            estado_pedido: estadoOperativo 
        };
    });

    const { error } = await supabase.from('ventas').insert(listaInserts);
    if (error) {
        alert(`Fallo Supabase: ${error.message}`);
    } else {
      // Descontamos del stock físico
      for (const item of carrito) {
        const pR = productos.find(p => p.id === item.producto_id);
        if (pR) await supabase.from('productos').update({ stock: pR.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0); alert("✅ Operación guardada.");
    }
  };

  // 5.4 REGISTRO DE PRODUCTOS (RE-INSTALADO)
  const handleAddProductoBJ = async (e) => {
    e.preventDefault();
    if (!formProd.nombre) return alert("Ingresa el nombre del modelo.");
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, 
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), 
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), 
        colores: formProd.colores
    }]);
    if (!error) {
        setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
        alert("✨ Nuevo modelo añadido al catálogo.");
    } else {
        alert(`Error al crear: ${error.message}`);
    }
  };

  // 5.5 REGISTRO DE FINANZAS (RE-INSTALADO)
  const handleRegistrarFinanzaMaster = async (e) => {
    e.preventDefault();
    const clM = handleInputMonto(formFinanzas.monto);
    if (!clM || Number(clM) <= 0) return alert("Ingresa un monto válido.");
    
    const { error } = await supabase.from('finanzas').insert([{
        tipo: formFinanzas.tipo, 
        descripcion: formFinanzas.descripcion, 
        monto: Number(clM), 
        origen: formFinanzas.origen 
    }]);
    if (!error) {
        setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); 
        alert("✅ Movimiento de caja registrado.");
    } else {
        alert(`Error en finanzas: ${error.message}`);
    }
  };

  // 5.6 EXPORTACIÓN AUDITOR (INCLUYE GESTIÓN)
  const handleExportarExcelCajaFull = () => {
    let csvBJ = "REPORTE DE AUDITORIA Y CIERRE DIARIO - BJ IMPORTACIONES\n";
    csvBJ += `Fecha de Auditoría: ${fechaConsulta}\n`;
    csvBJ += `--------------------------------------------------\n`;
    csvBJ += `SALDO CAJA GLOBAL,S/ ${balanceBunkerElite.cajaGlobal.toFixed(2)}\n`;
    csvBJ += `BOVEDA UTILIDADES DISPO,S/ ${balanceBunkerElite.bovedaRetiro.toFixed(2)}\n`;
    csvBJ += `VENTAS DEL DIA (EFECTIVO),S/ ${balanceBunkerElite.cajaHoy.toFixed(2)}\n`;
    csvBJ += `GANANCIA NETA DEL DIA,S/ ${balanceBunkerElite.ganHoy.toFixed(2)}\n`;
    csvBJ += `PTO. EQUILIBRIO MES,${balanceBunkerElite.pe_progreso.toFixed(1)}%\n`;
    csvBJ += `CAPITAL EN ALMACEN (COSTO),S/ ${valorizacionInventarioTotal.cost.toFixed(2)}\n`;
    csvBJBJ += `--------------------------------------------------\n\n`;
    csvBJ += "DETALLE DE OPERACIONES\n";
    csvBJ += "Hora,Cliente,Zona,Producto,Variante,Cant,Precio,Total\n";
    
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nomP = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csvBJ += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nomP},${v.color},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });

    const blobOBJ = new Blob([csvBJ], { type: 'text/csv;charset=utf-8;' });
    const linkB = document.createElement("a");
    linkB.setAttribute("href", URL.createObjectURL(blobOBJ));
    linkB.setAttribute("download", `AUDITORIA_BJ_${fechaConsulta}.csv`);
    document.body.appendChild(linkB);
    linkB.click();
    document.body.removeChild(linkB);
  };

  const handleCobrarDeudaBJ = async (grupoD) => {
    if(confirm(`¿Registrar pago total de S/ ${grupoD.total.toFixed(2)}?`)) {
        for(let it of grupoD.items) { await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', it.id); }
        alert("💰 Pago recibido correctamente.");
    }
  };

  const handleWhatsAppTicketDirecto = (grupoW) => {
    let t_ms = `¡Hola *${grupoW.cliente_nombre}*! 👋 Recibo de BJ Importaciones Chiclayo.%0A%0A`;
    grupoW.items.forEach(v => {
        const pR = productos.find(p => p.id === v.producto_id);
        t_ms += `- *${v.cantidad}x* ${pR?.nombre || 'Item'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    t_ms += `%0A*TOTAL PAGADO: S/ ${grupoH.total.toFixed(2)}*%0A¡Muchas gracias por elegirnos! 😊`;
    window.open(`https://wa.me/51${grupoW.telefono?.replace(/\D/g,'')}?text=${t_ms}`, '_blank');
  };

  const handleAnularVentaElite = async (v) => {
    if (confirm("¿Anular este ítem vendido? El stock volverá al catálogo.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // ============================================================
  // [BLOQUE 6] INTERFAZ DE USUARIO (JSX TOTALMENTE EXPANDIDO)
  // ============================================================

  const sInp_BJ = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const sCrd_BJ = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.5rem' }}>
        INICIANDO BUNKER BJ ELITE v68... 🚀💎
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR PRINCIPAL FULL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px', textTransform:'uppercase' }}>CHICLAYO • v68 MASTER TITANIUM</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== VISTA: VENTAS ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd_BJ}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA EFECTIVO HOY (LIQUIDO)</span>
                    <button onClick={handleExportarExcelCajaFull} style={{ background:`${FUCSIA_PRINCIPAL}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE CON BALANCES</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceBunkerElite.cH.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900', fontSize: '15px' }}>Ganancia Día: S/ {balanceBunkerElite.gH.toFixed(2)}</div>
              </div>
              <div style={sCrd_BJ}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL BJ</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp_BJ, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd_BJ, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'25px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Operación Chiclayo</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? OSCURO_BJ : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="cli_v68" placeholder="👤 Nombre Cliente" value={cliente} onChange={handleSeleccionarClienteAuto} style={sInp_BJ} />
                <datalist id="cli_v68">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={sInp_BJ} />
                <input placeholder="📍 Zona / Distrito" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp_BJ} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>VARIACIÓN: {item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', padding: '8px', borderRadius: '10px', border: '1px solid #FCA5D4', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize:'20px' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>✅ PAGADO/ENTREGA</button>
                    <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>📦 PAGADO/ALMACÉN</button>
                    <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>💸 DAR A PAGAR (CRÉDITO)</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp_BJ, marginBottom: '25px', height: '65px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tBJ = getEtiquetaProducto(p.created_at);
                  const pShowBJ = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const sLowBJ = Number(p.stock || 0) < 5;
                  return (
                    <div key={p.id} style={{ border: sLowBJ ? `2px solid ${ROJO_BJ}` : '1px solid #FFF1F2', padding: '22px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tBJ && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tBJ.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tBJ.tipo}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: sLowBJ ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: sLowBJ ? ROJO_BJ : VERDE_BJ }}>STOCK: {p.stock} U.</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...sInp_BJ, padding: '10px', fontSize: '14px', marginBottom: '18px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'10px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => handleAddAlCarritoElite(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? OSCURO_BJ : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pShowBJ).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial de Operaciones Diarias</h4>
                {historialVentasDiaBJ.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `1px solid #FCC2E2`, marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>⏰ HORA: {grupo.hora}</small>
                                <br/><strong style={{ color: OSCURO_BJ, fontSize: '22px' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => handleWhatsAppTicketDirecto(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight:'900', cursor:'pointer' }}>TICKET 📱</button>
                                <button onClick={() => {setEditandoGrupoId(grupo.id_grupo); setFormEditCliente({nombre: grupo.cliente_nombre, localidad: grupo.localidad, telefono: grupo.telefono});}} style={{ border:'none', background:'#fff', padding:'10px', borderRadius:'12px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div>
                                    {idItemVentaEditando === v.id ? (
                                        <div style={{display:'flex', gap:'10px'}}>
                                            <input type="number" value={nuevaCantVenta} onChange={(e)=>setNuevaCantVenta(Number(e.target.value))} style={{width:'60px', padding:'5px', borderRadius:'8px', border:'1px solid #ccc'}} />
                                            <button onClick={()=>handleAnularVentaElite(v)} style={{background:VERDE_BJ, color:'#fff', border:'none', borderRadius:'8px', padding:'5px 10px'}}>OK</button>
                                        </div>
                                    ) : (
                                        <small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre || 'Item'} ({v.color}) | <span style={{color: v.estado_pedido==='Pendiente de Pago' ? AMARILLO_BJ : '#64748B'}}>{v.estado_pedido}</span></small>
                                    )}
                                </div>
                                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                    <strong>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</strong>
                                    <button onClick={()=>handleAnularVentaElite(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold', cursor:'pointer'}}>🗑️</button>
                                </div>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== VISTA: LOGÍSTICA ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={sCrd_BJ}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginBottom:'25px' }}>📦 Entregas Pendientes (Ya Pagado)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaMaster.almacen.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '25px' }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `¡Hola *${grupo.cliente}*! 👋 BJ Importaciones te avisa que tu pedido está listo para recoger. ✨📦`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:'#25D366', color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                            </div>
                            <button onClick={async () => { if(confirm("¿Confirmar entrega física?")) { for(let it of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', it.id); } }} style={{ width: '100%', backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CONFIRMAR ENTREGA ✅</button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ ...sCrd_BJ, borderLeft: `15px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: AMARILLO_BJ, marginBottom:'25px' }}>💸 Cuentas Deudoras (Ventas a Crédito)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {logisticaMaster.cuentasPorCobrar.map((grupo, idx) => (
                        <div key={idx} style={{ padding: '25px', backgroundColor: '#FFFBEB', borderRadius: '25px', border:`2px solid ${AMARILLO_BJ}40` }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                                <div><strong>{grupo.cliente}</strong><br/><small>{grupo.localidad}</small></div>
                                <button onClick={() => { let m = `Hola *${grupo.cliente}* 👋 BJ Importaciones te recuerda tu saldo pendiente de S/ ${grupo.total.toFixed(2)}. ✨`; window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank'); }} style={{ background:AMARILLO_BJ, color:'#fff', border:'none', padding:'10px 15px', borderRadius:'12px', fontWeight:'900', cursor:'pointer' }}>RECORDAR 📱</button>
                            </div>
                            <h4 style={{color:AMARILLO_BJ, margin:'10px 0'}}>SALDO DEUDOR: S/ {grupo.total.toFixed(2)}</h4>
                            <button onClick={() => handleCobrarDeudaBJ(grupo)} style={{ width: '100%', backgroundColor: VERDE_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>💰 REGISTRAR PAGO TOTAL (COBRAR)</button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* ===================== VISTA: GESTIÓN (BUNKER v68) ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                {/* 1. PUNTO DE EQUILIBRIO MENSUAL */}
                <div style={sCrd_BJ}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO (UTILIDAD REAL VENTAS)</h4>
                    <div style={{height:'20px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px', border:'1px solid #eee'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ.pe_p}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad Mes: S/ {balanceEliteBJ.pe_g.toFixed(2)}</span>
                        <strong>Meta Gasto: S/ {balanceEliteBJ.pe_m.toFixed(2)}</strong>
                    </div>
                </div>

                {/* 2. BÓVEDA DE GANANCIAS ACUMULADAS */}
                <div style={{ ...sCrd_BJ, backgroundColor: OSCURO_BJ, color: '#fff', border:`4px solid ${FUCSIA_PRINCIPAL}` }}>
                    <h4 style={{margin:0, color:FUCSIA_PRINCIPAL, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA: DISPONIBLE PARA RETIRO (GANANCIA NETA)</h4>
                    <h3 style={{fontSize:'3.2rem', margin:0, color:'#fff'}}>S/ {balanceEliteBJ.bR.toFixed(2)}</h3>
                    <small style={{opacity:0.6}}>Ganancia neta acumulada histórica menos tus retiros personales marcados como "Ganancias".</small>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ ...sCrd_BJ, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN (COSTO PRODUCTOS)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {valorizacionInventario.cost.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...sCrd_BJ, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL ACTUAL (DINERO EN MANO)</small>
                    <h4 style={{fontSize:'2.2rem', margin:'10px 0'}}>S/ {balanceEliteBJ.cG.toFixed(2)}</h4>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '45px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Registrar Movimiento de Caja Detallado</h4>
                  <form onSubmit={handleRegistrarFinanzaMaster} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                        <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={sInp_BJ}>
                            <option value="Gasto Local">🏪 Gasto Local</option>
                            <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                            <option value="Retiro Personal">🏧 Retiro Personal</option>
                            <option value="Ingreso Adicional">💰 Inyección Capital</option>
                        </select>
                        <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={{...sInp_BJ, border:`2px solid ${AMARILLO_BJ}`}}>
                            <option value="Caja Global">De: Caja Global</option>
                            <option value="Ganancias">De: Ganancias</option>
                        </select>
                    </div>
                    <input placeholder="Descripción del movimiento..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp_BJ} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                <div style={{ ...sCrd_BJ, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Subir Nuevo Producto al Catálogo</h4>
                  <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp_BJ} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input type="text" placeholder="Costo Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp_BJ} />
                        <input type="number" placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp_BJ} />
                    </div>
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={sCrd_BJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🏆 PRODUCTOS MÁS RENTABLES</h4>
                  {analyticsBJMaster.ranking.map((p, i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f1f1f1'}}>
                        <span>{i+1}. {p[0]}</span>
                        <strong style={{color:VERDE_BJ}}>+ S/ {p[1].toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <div style={{...sCrd_BJ, borderLeft:`12px solid ${ROJO_BJ}`}}>
                    <h4 style={{margin:0, color:ROJO_BJ, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💤 CAPITAL DORMIDO (+20 DÍAS SIN VENTA)</h4>
                    {analyticsBJMaster.dormidos.map((p, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                            <span>{p.nombre}</span>
                            <strong style={{color:ROJO_BJ}}>{p.stock} Unidades</strong>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            <div style={bjCrdStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario de Operaciones BJ</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <tbody>
                        {finanzas.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            <td style={{ padding: '20px 10px' }}>
                                <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                <br/><span style={{ fontWeight: '600', fontSize:'15px' }}>{f.descripcion}</span>
                                <br/><small style={{color: AMARILLO_BJ, fontWeight:'900'}}>Origen: {f.origen || 'Caja Global'}</small>
                            </td>
                            <td style={{ textAlign: 'right', padding: '20px 10px', fontWeight: '900', fontSize: '18px', color: (f.tipo.includes('Ingreso')) ? VERDE_BJ : OSCURO_BJ }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={sCrd_BJ}>
                <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión Almacén</h4>
                <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={seriesROIConfig} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={90}>
                                {seriesROIConfig.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const bjCrdStyle = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };