// ══════════════════════════════════════════════════════════
//  formData.js — Datos de referencia para formulario clínico
// ══════════════════════════════════════════════════════════

export const SERVICIOS_SOLICITANTES = [
  'Servicio de Atención de Urgencia',
  'Centro Adosado de Especialidades',
  'Pabellón Quirúrgico y Recuperación',
  'CECOSAM',
  'UGCC',
  'Hospitalización Domiciliaria (HODOM)'
];

export const PREVISIONES = [
  'FONASA A',
  'FONASA B',
  'FONASA C',
  'FONASA D',
  'ISAPRE Banmédica',
  'ISAPRE Colmena Golden Cross',
  'ISAPRE Cruz Blanca',
  'ISAPRE Cruz del Norte',
  'ISAPRE Esencial',
  'ISAPRE MasVida',
  'ISAPRE Nueva MasVida',
  'ISAPRE Vida Tres',
  'ISAPRE Consalud',
  'ISAPRE Fundación',
  'CAPREDENA',
  'DIPRECA',
  'PRAIS',
  'Particular (sin previsión)',
  'Extranjero sin previsión',
  'Convenio Internacional',
  'Sin identificar',
];

export const ESPECIALIDADES = [
  // ── Generales ──────────────────────────────────
  'Medicina General',
  'Odontología General',
  'Hospitalización Domiciliaria',
  'Medicina Familiar',
  'Medicina de Urgencia y Emergencia',
  'Química y Farmacia',
  'PROA',
  // ── Especialidades Médicas CONACEM ─────────────
  'Anatomía Patológica',
  'Anestesiología',
  'Bioquímica Clínica',
  'Broncopulmonar / Neumología',
  'Broncopulmonar Pediátrica',
  'Cardiología',
  'Cardiología Pediátrica',
  'Cirugía Cardíaca',
  'Cirugía de Cabeza, Cuello y Maxilofacial',
  'Cirugía de Tórax',
  'Cirugía General',
  'Cirugía Pediátrica',
  'Cirugía Plástica y Reparadora',
  'Cirugía Vascular Periférica',
  'Coloproctología',
  'Dermatología',
  'Endocrinología',
  'Endocrinología Pediátrica',
  'Enfermedades Infecciosas (Infectología)',
  'Gastroenterología',
  'Gastroenterología Pediátrica',
  'Genética Clínica',
  'Geriatría',
  'Ginecología y Obstetricia',
  'Hematología',
  'Hematología Oncológica',
  'Hemato-Oncología Pediátrica',
  'Hepatología',
  'Inmunología Clínica',
  'Medicina del Trabajo',
  'Medicina Física y Rehabilitación',
  'Medicina Intensiva (UCI Adulto)',
  'Medicina Intensiva Pediátrica',
  'Medicina Interna',
  'Medicina Legal y Forense',
  'Medicina Nuclear',
  'Medicina Paliativa',
  'Nefrología',
  'Nefrología Pediátrica',
  'Neonatología',
  'Neurocirugía',
  'Neurología',
  'Neurología Pediátrica',
  'Neurorradiología',
  'Oftalmología',
  'Oncología Médica',
  'Oncología Radioterápica',
  'Ortopedia y Traumatología',
  'Otorrinolaringología',
  'Parasitología y Micología Clínica',
  'Pediatría',
  'Psiquiatría',
  'Psiquiatría Infanto-Juvenil',
  'Radiología / Diagnóstico por Imágenes',
  'Reumatología',
  'Urología',
  'Urología Pediátrica',
  // ── Especialidades Odontológicas ───────────────
  'Cirugía y Traumatología Bucomaxilofacial',
  'Endodoncia',
  'Implantología Oral',
  'Ortodoncia y Ortopedia Dento-Máxilo-Facial',
  'Patología Oral',
  'Periodoncia',
  'Radiología Oral y Maxilofacial',
  'Rehabilitación Oral (Prostodoncia)',
  'Odontopediatría',
  'Salud Pública Odontológica',
];

export const COMUNAS_CHILE = [
  // ── Región de Arica y Parinacota ─────────────
  'Arica','Camarones','General Lagos','Putre',
  // ── Región de Tarapacá ───────────────────────
  'Alto Hospicio','Camiña','Colchane','Huara','Iquique','Pica','Pozo Almonte',
  // ── Región de Antofagasta ────────────────────
  'Antofagasta','Calama','María Elena','Mejillones','Ollagüe','San Pedro de Atacama','Sierra Gorda','Taltal','Tocopilla',
  // ── Región de Atacama ────────────────────────
  'Alto del Carmen','Caldera','Chañaral','Copiapó','Diego de Almagro','Freirina','Huasco','Tierra Amarilla','Vallenar',
  // ── Región de Coquimbo ───────────────────────
  'Andacollo','Canela','Combarbalá','Coquimbo','Illapel','La Higuera','La Serena','Los Vilos','Monte Patria','Ovalle','Paiguano','Punitaqui','Río Hurtado','Salamanca','Vicuña',
  // ── Región de Valparaíso ─────────────────────
  'Algarrobo','Cabildo','Calera','Calle Larga','Cartagena','Casablanca','Catemu','Concón','El Quisco','El Tabo','Hijuelas','Isla de Pascua','Juan Fernández','La Cruz','La Ligua','Limache','Llaillay','Los Andes','Nogales','Olmué','Panquehue','Papudo','Petorca','Puchuncaví','Putaendo','Quillota','Quilpué','Quintero','Rinconada','San Antonio','San Esteban','San Felipe','Santa María','Santo Domingo','Valparaíso','Villa Alemana','Viña del Mar','Zapallar',
  // ── Región Metropolitana ─────────────────────
  'Alhué','Buin','Calera de Tango','Cerrillos','Cerro Navia','Colina','Conchalí','Curacaví','El Bosque','El Monte','Estación Central','Huechuraba','Independencia','Isla de Maipo','La Cisterna','La Florida','La Granja','La Pintana','La Reina','Lampa','Las Condes','Lo Barnechea','Lo Espejo','Lo Prado','Macul','Maipú','María Pinto','Melipilla','Miraflores (RM)','Ñuñoa','Padre Hurtado','Paine','Pedro Aguirre Cerda','Peñaflor','Peñalolén','Pirque','Providencia','Pudahuel','Puente Alto','Quilicura','Quinta Normal','Recoleta','Renca','San Bernardo','San Joaquín','San José de Maipo','San Miguel','San Pedro (RM)','San Ramón','Santiago','Talagante','Tiltil','Vitacura',
  // ── Región del Libertador O'Higgins ──────────
  'Chimbarongo','Chépica','Codegua','Coinco','Coltauco','Doñihue','Graneros','La Estrella','Las Cabras','Litueche','Lolol','Machalí','Malloa','Marchigüe','Nancagua','Navidad','Olivar','Paredones','Palmilla','Peumo','Pichidegua','Pichilemu','Placilla','Pumanque','Quinta de Tilcoco','Rancagua','Rengo','Requínoa','San Fernando','San Francisco de Mostazal','San Vicente de Tagua Tagua','Santa Cruz (O\'H)',
  // ── Región del Maule ─────────────────────────
  'Cauquenes','Chanco','Colbún','Constitución','Curepto','Curicó','Empedrado','Hualañé','Licantén','Linares','Longaví','Maule','Molina','Parral','Pelarco','Pelluhue','Pencahue','Rauco','Retiro','Romeral','Sagrada Familia','San Clemente','San Javier','San Rafael','Talca','Teno','Vichuquén','Villa Alegre','Yerbas Buenas',
  // ── Región del Ñuble ─────────────────────────
  'Bulnes','Chillán','Chillán Viejo','Cobquecura','Coelemu','Coihueco','El Carmen','Ninhue','Ñiquén','Pemuco','Pinto','Portezuelo','Quillón','Quirihue','Ránquil','San Carlos','San Fabián','San Ignacio','San Nicolás','Treguaco','Yungay',
  // ── Región del Biobío ────────────────────────
  'Alto Biobío','Antuco','Arauco','Cabrero','Cañete','Concepción','Contulmo','Coronel','Curanilahue','Florida','Hualpén','Hualqui','Laja','Lebu','Los Álamos','Los Ángeles','Lota','Mulchén','Nacimiento','Negrete','Penco','Quilaco','Quilleco','San Pedro de la Paz','San Rosendo','Santa Bárbara','Santa Juana','Talcahuano','Tirúa','Tomé','Tucapel','Yumbel',
  // ── Región de La Araucanía ───────────────────
  'Angol','Carahue','Cholchol','Collipulli','Cunco','Curacautín','Curarrehue','Ercilla','Freire','Galvarino','Gorbea','Lautaro','Loncoche','Lonquimay','Los Sauces','Lumaco','Melipeuco','Nueva Imperial','Padre Las Casas','Perquenco','Pitrufquén','Pucón','Purén','Renaico','Saavedra','Temuco','Teodoro Schmidt','Toltén','Traiguén','Victoria','Vilcún','Villarrica',
  // ── Región de Los Ríos ───────────────────────
  'Corral','Futrono','La Unión','Lago Ranco','Lanco','Los Lagos','Máfil','Mariquina','Paillaco','Panguipulli','Río Bueno','Valdivia',
  // ── Región de Los Lagos ──────────────────────
  'Ancud','Calbuco','Castro','Chaitén','Chonchi','Cochamó','Curaco de Vélez','Dalcahue','Fresia','Frutillar','Futaleufú','Hualaihué','Llanquihue','Los Muermos','Maullín','Osorno','Palena','Puerto Montt','Puerto Octay','Puerto Varas','Puqueldón','Purranque','Puyehue','Queilén','Quellón','Quemchi','Quinchao','Río Negro','San Juan de la Costa','San Pablo',
  // ── Región de Aysén ──────────────────────────
  'Aysén','Chile Chico','Cisnes','Cochrane','Coihaique','Guaitecas','Lago Verde','O\'Higgins','Río Ibáñez','Tortel',
  // ── Región de Magallanes ─────────────────────
  'Antártica','Cabo de Hornos','Laguna Blanca','Natales','Porvenir','Primavera','Punta Arenas','Río Verde','San Gregorio','Timaukel','Torres del Paine',
];
