import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import Replicate from "replicate";

import { checkSubscription } from "@/lib/subscription";
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const openai = new OpenAIApi(configuration);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(
  req: Request
) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt, num_outputs = "1", height = "256", width = "256" } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // if (!configuration.apiKey) {
    //   return new NextResponse("OpenAI API Key not configured.", { status: 500 });
    // }

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    if (!num_outputs) {
      return new NextResponse("num_outputs is required", { status: 400 });
    }

    if (!height) {
      return new NextResponse("Height is required", { status: 400 });
    }

    if (!width) {
      return new NextResponse("width is required", { status: 400 });
    }
    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial has expired. Please upgrade to pro.", { status: 403 });
    }

    // const response = await openai.createImage({
    //   prompt,
    //   n: parseInt(num_outputs, 10),
    //   size: resolution,
    // });
    const input = {
      prompt: String(prompt),
      num_outputs: Number(num_outputs),
      height: Number(height),
      width: Number(width),
      scheduler: "K_EULER"
    }

    const response = await replicate.run("stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", { input });
    console.log(response)
    if (!isPro) {
      await incrementApiLimit();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.log('[IMAGE_ERROR]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
};
