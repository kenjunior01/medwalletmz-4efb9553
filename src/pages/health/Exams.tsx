import ComingSoon from "@/pages/ComingSoon";

export default function Exams() {
  return (
    <ComingSoon
      title="Exames laboratoriais"
      description="Marca exames de sangue, raio-X e outros em laboratórios parceiros de Maputo e Matola, com recolha em casa e resultados na app."
      eta="Em breve"
      features={[
        "Marcação online com escolha de laboratório e horário",
        "Recolha de amostras ao domicílio em Maputo e Matola",
        "Resultados em PDF directo na tua conta — partilha com o teu médico em 1 toque",
        "Pagamento via carteira MZN, M-Pesa ou e-Mola",
      ]}
    />
  );
}