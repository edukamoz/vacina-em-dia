import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Alternar } from '../../components/alternar';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import { useAcceptConsent } from '../data/hooks';
import { TERMS_PARAGRAPHS, TERMS_VERSION } from './terms';

/**
 * Consentimento explícito do primeiro acesso (RF09, LGPD): termo em linguagem simples, aceite
 * obrigatório e, para quem cadastra crianças e adolescentes, a declaração de responsável.
 */
export function ConsentScreen() {
  const router = useRouter();
  const accept = useAcceptConsent();
  const [aceitou, setAceitou] = useState(false);
  const [responsavel, setResponsavel] = useState(false);

  return (
    <Tela titulo="Antes de começar" subtitulo="Leia com calma. Você decide se quer continuar.">
      <Cartao className="gap-md">
        {TERMS_PARAGRAPHS.map((paragrafo) => (
          <Texto key={paragrafo}>{paragrafo}</Texto>
        ))}
        <Texto variante="apoio" className="text-textoSecundario">
          {`Versão do termo: ${TERMS_VERSION}`}
        </Texto>
      </Cartao>

      <View className="gap-sm">
        <Alternar
          rotulo="Li e aceito o termo de consentimento"
          marcado={aceitou}
          aoAlterar={setAceitou}
        />
        <Alternar
          rotulo="Sou o responsável legal pelas crianças e adolescentes que eu cadastrar"
          marcado={responsavel}
          aoAlterar={setResponsavel}
        />
      </View>

      {accept.error ? (
        <Texto className="text-erro" accessibilityRole="alert">
          {accept.error.message}
        </Texto>
      ) : null}

      <Botao
        titulo="Aceitar e continuar"
        disabled={!aceitou || accept.isPending}
        onPress={() =>
          accept.mutate(
            { acceptedTerms: true, termVersion: TERMS_VERSION, guardianDeclaration: responsavel },
            { onSuccess: () => router.replace('/') },
          )
        }
      />
      <Texto variante="apoio" className="text-textoSecundario">
        Esta é uma versão de demonstração de um projeto acadêmico. Não cadastre dados de pessoas sem
        a autorização delas.
      </Texto>
    </Tela>
  );
}
