```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT : Checkout (Soft Lock)
    
    PENDING_PAYMENT --> PAID : BLIK Webhook (Hard Lock)
    PENDING_PAYMENT --> CANCELLED : Cron Job (Timeout 3m)
    
    PAID --> PRINTING : Admin Closes Drop
    PAID --> REFUNDED : Admin Action
    
    PRINTING --> PACKED : Makers FIFO (All items printed)
    PRINTING --> REFUNDED : Admin Action
    
    PACKED --> SHIPPED : Admin Generates InPost Label
    PACKED --> REFUNDED : Admin Action
    
    SHIPPED --> DELIVERED : InPost Webhook
    
    CANCELLED --> [*]
    REFUNDED --> [*]
    DELIVERED --> [*]
```