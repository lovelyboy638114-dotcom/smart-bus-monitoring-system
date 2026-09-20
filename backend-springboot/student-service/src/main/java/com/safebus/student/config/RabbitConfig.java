package com.safebus.student.config;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String REGISTRATION_QUEUE = "student-registration-queue";
    public static final String REGISTRATION_EXCHANGE = "student-exchange";
    public static final String REGISTRATION_ROUTING_KEY = "student.event.registered";

    @Bean
    public Queue registrationQueue() {
        return QueueBuilder.durable(REGISTRATION_QUEUE).build();
    }

    @Bean
    public TopicExchange registrationExchange() {
        return new TopicExchange(REGISTRATION_EXCHANGE);
    }

    @Bean
    public Binding registrationBinding(
            @Qualifier("registrationQueue") Queue registrationQueue,
            @Qualifier("registrationExchange") TopicExchange registrationExchange) {
        return BindingBuilder.bind(registrationQueue).to(registrationExchange).with(REGISTRATION_ROUTING_KEY);
    }
}
