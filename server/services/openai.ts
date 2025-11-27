import OpenAI from "openai";
import fs from "fs";
import { promisify } from "util";
import type { Multer } from "multer";

const readFile = promisify(fs.readFile);

let cachedOpenAIClient: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  if (!cachedOpenAIClient) {
    cachedOpenAIClient = new OpenAI({ apiKey });
  }

  return cachedOpenAIClient;
}

export async function processText(text: string) {
  try {
    const openai = getOpenAIClient();
    console.log('Iniciando processamento do texto');
    
    // Verificar e truncar texto se necessário
    const MAX_CHARS = 32000; // Limite aproximado para GPT-4
    let processedText = text;
    
    if (text.length > MAX_CHARS) {
      console.log(`Texto muito longo (${text.length} caracteres), truncando para ${MAX_CHARS} caracteres`);
      processedText = text.substring(0, MAX_CHARS);
    }
    
    console.log('Primeiros 200 caracteres:', processedText.substring(0, 200));
    console.log('API Key configurada:', !!process.env.OPENAI_API_KEY);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em extrair informações de produtos. Analise o texto e retorne apenas um JSON válido no seguinte formato, sem texto adicional: { \"produtos\": [{ \"nome\": \"nome do produto\", \"quantidade\": número, \"preco\": número }] }. Se a quantidade ou preço não estiverem disponíveis, use null."
        },
        {
          role: "user",
          content: processedText
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" } // Garante resposta em JSON
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Resposta vazia da OpenAI");
    }

    console.log('Resposta recebida da OpenAI');

    // Tenta analisar o JSON e validar
    try {
      const result = JSON.parse(content);

      // Validação básica
      if (!result.produtos || !Array.isArray(result.produtos)) {
        throw new Error("Formato de resposta inválido: 'produtos' não é um array");
      }

      return {
        analysis: content
      };
    } catch (jsonError) {
      console.error('Erro ao analisar JSON da resposta:', jsonError);
      if (jsonError instanceof Error) {
        throw new Error(`Falha ao analisar resposta: ${jsonError.message}`);
      }
      throw new Error("Falha ao analisar resposta da OpenAI");
    }
  } catch (error) {
    console.error('Erro ao processar texto:', error);
    if (error instanceof Error) {
      console.error('Nome do erro:', error.name);
      console.error('Mensagem do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

export async function processDocument(file: Express.Multer.File) {
  try {
    console.log('Iniciando processamento do arquivo:', file.originalname);
    console.log('Tipo do arquivo:', file.mimetype);
    console.log('Tamanho do arquivo:', file.size);
    console.log('Caminho temporário:', file.path);

    const content = await readFile(file.path, 'utf-8');
    console.log('Conteúdo do documento (primeiros 200 caracteres):', content.substring(0, 200));

    const result = await processText(content);

    return {
      type: 'document',
      analysis: result.analysis,
      source: file.originalname
    };
  } catch (error) {
    console.error('Erro ao processar documento:', error);
    if (error instanceof Error) {
      console.error('Nome do erro:', error.name);
      console.error('Mensagem do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  } finally {
    try {
      await fs.promises.unlink(file.path);
      console.log('Arquivo temporário removido:', file.path);
    } catch (unlinkError) {
      console.error('Erro ao remover arquivo temporário:', unlinkError);
    }
  }
}
