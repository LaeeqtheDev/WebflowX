"use client";

import React from "react";
import {
  Card,
  CardBody,
  Typography,
} from "@material-tailwind/react";

import {FaHeart} from 'react-icons/fa'

interface TestimonialCardPropsType {
  img: string;
  client: string;
  title: string;
  clientInfo: string;
}

function TestimonialCard({
  img,
  client,
  title,
  clientInfo,
}: TestimonialCardPropsType) {
  return (
    <Card shadow={false} className="bg-gray-100/50 rounded-2xl p-6">
      <Typography
        color="blue-gray"
        className="lg:mb-20 mb-4 text-2xl font-bold"
      >
        &quot;{title}&quot;
      </Typography>

      <CardBody className="px-4 py-0 flex flex-wrap-reverse gap-x-6 justify-between items-center">
        <div>
          <Typography variant="h6" color="blue-gray">
            {client}
          </Typography>
          <Typography
            variant="paragraph"
            className="font-normal text-gray-500"
          >
            {clientInfo}
          </Typography>
        </div>
        <img src={img} className="max-w-32" alt={client} />
      </CardBody>
    </Card>
  );
}

const testimonials = [
  {
    title:
      "The team went above and beyond to ensure my issue was resolved quickly and efficiently. Truly outstanding!",
    client: "Jessica Devis",
    clientInfo: "Full Stack Developer @Netflix",
    img: "/image/netflix.svg",
  },
  {
    title:
      "It has broadened my horizons and helped me advance my career. The community is incredibly supportive.",
    client: "Marcell Glock",
    clientInfo: "Graphic Designer @Coinbase",
    img: "/image/Logo-coinbase.svg",
  },
];

export function TestimonialSection16() {
  return (
    <section className="px-8 py-10 lg:py-28">
      <div className="container mx-auto">
        <Typography
          variant="h2"
          color="blue-gray"
          className="mb-4 text-2xl lg:text-4xl justify-center text-center items-center mx-auto "
        >
The{" "}
<span className="text-red-400 font-semibold inline-flex items-center gap-2">
  Heartfelt <FaHeart />
</span>{" "}
testimonials of our{" "}
<span className="underline decoration-amber-500 underline-offset-8">
  {" "}
  <span className="text-orange-500">{" "}C</span>ommunity
</span>

        </Typography>

        <Typography
          variant="lead"
          className="max-w-3xl text-gray-500 mb-10 lg:mb-20 justify-center text-center items-center mx-auto"
        >
          From enterprise-grade tooling to reliable performance and thoughtful
          design teams trust WebflowX to move faster without compromise.
        </Typography>

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
          {testimonials.map((props, key) => (
            <TestimonialCard key={key} {...props} />
          ))}
        </div>

        <Card
          shadow={false}
          className="mt-8 bg-gray-100/50 text-center rounded-2xl p-6"
        >
          <Typography
            color="blue-gray"
            className="mb-4 text-2xl lg:text-3xl max-w-4xl leading-snug mx-auto font-bold"
          >
            &quot;Its intuitive workflows and production-ready architecture make
            it indispensable. We scaled faster than ever with WebflowX.&quot;
          </Typography>

          <CardBody className="items-center mx-auto py-2">
            <img
              src="/image/spotify.svg"
              className="max-w-32 mx-auto grayscale"
              alt="spotify"
            />
            <Typography variant="h6" color="blue-gray">
              Emma Roberts
            </Typography>
            <Typography
              variant="paragraph"
              className="font-normal text-gray-500"
            >
              Chief Executive @Spotify
            </Typography>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

export default TestimonialSection16;
