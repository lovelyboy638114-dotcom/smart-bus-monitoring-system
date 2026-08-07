package com.safebus.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String ATTENDANCE_QUEUE = "attendance-queue";
    public static final String ATTENDANCE_EXCHANGE = "attendance-exchange";
    public static final String ATTENDANCE_ROUTING_KEY = "attendance.event.*";

    public static final String SOS_QUEUE = "sos-queue";
    public static final String SOS_EXCHANGE = "sos-exchange";
    public static final String SOS_ROUTING_KEY = "sos.event.*";

    @Bean
    public Queue attendanceQueue() {
        return QueueBuilder.durable(ATTENDANCE_QUEUE).build();
    }

    @Bean
    public TopicExchange attendanceExchange() {
        return new TopicExchange(ATTENDANCE_EXCHANGE);
    }

    @Bean
    public Binding attendanceBinding(
            @Qualifier("attendanceQueue") Queue attendanceQueue, 
            @Qualifier("attendanceExchange") TopicExchange attendanceExchange) {
        return BindingBuilder.bind(attendanceQueue).to(attendanceExchange).with(ATTENDANCE_ROUTING_KEY);
    }

    @Bean
    public Queue sosQueue() {
        return QueueBuilder.durable(SOS_QUEUE).build();
    }

    @Bean
    public TopicExchange sosExchange() {
        return new TopicExchange(SOS_EXCHANGE);
    }

    @Bean
    public Binding sosBinding(
            @Qualifier("sosQueue") Queue sosQueue, 
            @Qualifier("sosExchange") TopicExchange sosExchange) {
        return BindingBuilder.bind(sosQueue).to(sosExchange).with(SOS_ROUTING_KEY);
    }
}
